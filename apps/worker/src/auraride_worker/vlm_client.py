"""VLM 客户端 + 6 级优雅降级链。

降级顺序(每一级失败 → 下一级,绝不抛到 actor 外):
1. 无 API key                  → Pillow 平均色
2. 当日预算耗尽                → Pillow 平均色
3. DashScope API 异常 / 超时   → Pillow 平均色
4. JSON 解析失败              → Pillow 平均色
5. color_id 不在白名单         → Pillow 平均色
6. Pillow 也失败(图损坏)    → tired-gray 兜底

返回值统一是 ``ColorVote``,actor 拿到就写库,不再处理失败。
"""

from __future__ import annotations

import base64
import io
import json
from dataclasses import dataclass
from typing import Protocol

from PIL import Image, UnidentifiedImageError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .budget import BudgetExceeded, RedisLike, check_and_charge
from .colors import ColorId, nearest_color_id, parse_color_id
from .config import get_settings
from .logging_setup import get_logger
from .prompts import COLORIZE_SYSTEM_PROMPT, COLORIZE_USER_PROMPT

log = get_logger(__name__)


@dataclass(slots=True)
class ColorVote:
    """单张照片染色结果 —— 喂给 ``aggregate_segment_color`` 投票。"""

    color_id: ColorId
    confidence: float
    source: str  # "vlm" | "pillow" | "fallback"


class DashScopeLike(Protocol):
    """最小 DashScope 接口 —— 真 SDK 与测试 stub 均满足。

    返回值:解析后的 dict,至少含 ``color_id`` / ``confidence``。失败抛任意异常。
    """

    def call(self, *, model: str, image_bytes: bytes) -> dict: ...


# --- Pillow 降级:取主色调 → 映射到最近的 ColorId ---


def _pillow_average_color(image_bytes: bytes) -> ColorVote:
    """缩到 64×64 取平均,粗暴但稳定。失败抛 ``ValueError`` 让上层最终兜底。"""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = img.convert("RGB").resize((64, 64))
            pixels = list(img.getdata())
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Pillow 无法解析图像:{exc}") from exc

    n = len(pixels) or 1
    r = sum(p[0] for p in pixels) // n
    g = sum(p[1] for p in pixels) // n
    b = sum(p[2] for p in pixels) // n
    cid = nearest_color_id((r, g, b))
    log.debug("pillow_average_color", rgb=(r, g, b), color_id=cid.value)
    return ColorVote(color_id=cid, confidence=0.4, source="pillow")


def _ultimate_fallback() -> ColorVote:
    """连 Pillow 都失败:返回 tired-gray —— manifesto "一阵没有轨迹的风"。"""
    return ColorVote(color_id=ColorId.TIRED_GRAY, confidence=0.1, source="fallback")


# --- DashScope 真调用(可选,失败立刻降级) ---


@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=0.5, max=2),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
    reraise=True,
)
def _call_dashscope(client: DashScopeLike, image_bytes: bytes) -> dict:
    settings = get_settings()
    return client.call(model=settings.dashscope_vlm_model, image_bytes=image_bytes)


def _parse_vlm_response(payload: dict) -> ColorVote | None:
    """JSON 解析 + 白名单校验。任一失败返回 None,触发降级。"""
    cid = parse_color_id(payload.get("color_id"))
    if cid is None:
        log.warning("vlm_unknown_color_id", raw=payload.get("color_id"))
        return None
    try:
        conf = float(payload.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    return ColorVote(color_id=cid, confidence=conf, source="vlm")


# --- 顶层入口:actor 只调这一个函数 ---


def colorize(
    image_bytes: bytes,
    *,
    redis: RedisLike,
    dashscope: DashScopeLike | None = None,
) -> ColorVote:
    """对一张照片染色。绝不抛 —— 6 级降级链一定能给出 ``ColorVote``。"""
    settings = get_settings()

    # 1) 无 key → Pillow
    if not settings.has_vlm_key or dashscope is None:
        log.info("vlm_skip_no_key", has_key=settings.has_vlm_key, has_client=dashscope is not None)
        try:
            return _pillow_average_color(image_bytes)
        except ValueError:
            return _ultimate_fallback()

    # 2) 预算闸门
    try:
        check_and_charge(redis)
    except BudgetExceeded as exc:
        log.warning("vlm_budget_exceeded", reason=str(exc))
        try:
            return _pillow_average_color(image_bytes)
        except ValueError:
            return _ultimate_fallback()

    # 3) 调 DashScope(已带重试 + 退避)
    try:
        payload = _call_dashscope(dashscope, image_bytes)
    except Exception as exc:
        log.warning("vlm_api_error", error=str(exc))
        try:
            return _pillow_average_color(image_bytes)
        except ValueError:
            return _ultimate_fallback()

    # 4 + 5) JSON / 白名单校验
    vote = _parse_vlm_response(payload)
    if vote is not None:
        return vote
    try:
        return _pillow_average_color(image_bytes)
    except ValueError:
        return _ultimate_fallback()


# --- 真 DashScope 适配器(actor 启动时构造,测试可 mock) ---


class DashScopeAdapter:
    """把 ``dashscope.MultiModalConversation`` 包成 ``DashScopeLike``。

    真 SDK 在生产环境用,测试一律走 ``StubDashScope``。
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def call(self, *, model: str, image_bytes: bytes) -> dict:
        # 延迟 import:测试不需要装 dashscope
        from dashscope import MultiModalConversation  # type: ignore[import-not-found]

        b64 = base64.b64encode(image_bytes).decode("ascii")
        messages = [
            {"role": "system", "content": [{"text": COLORIZE_SYSTEM_PROMPT}]},
            {
                "role": "user",
                "content": [
                    {"image": f"data:image/jpeg;base64,{b64}"},
                    {"text": COLORIZE_USER_PROMPT},
                ],
            },
        ]
        resp = MultiModalConversation.call(
            api_key=self._api_key,
            model=model,
            messages=messages,
            temperature=0.1,
            result_format="message",
        )
        # DashScope 返回结构:{"output":{"choices":[{"message":{"content":[{"text":"..."}]}}]}}
        text = resp["output"]["choices"][0]["message"]["content"][0]["text"]
        return json.loads(text)
