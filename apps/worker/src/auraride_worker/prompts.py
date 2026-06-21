"""VLM 染色 prompt —— 严格按 Plan B §3.3 设计。

设计要点(改 prompt 前必读):
1. **JSON 输出**:避免自由文本解析,LLM 容易跑偏
2. **低温度**:取 0.1,稳定性 > 创造性 —— 染色是分类任务
3. **5 ColorId 白名单内联**:把色卡贴进 prompt,模型不能编新颜色
4. **要求 confidence**:校准失败时可以加阈值降级
5. **中文**:DashScope 通义千问 VL 中文场景更稳

任何 prompt 改动:**先在 Plan B 章节加记录,再改这里**。
"""

from __future__ import annotations

from .colors import COLOR_ORDER, COLOR_PROFILES

#: prompt 模板内联的色卡块 —— 一次生成,所有调用共享。
_COLOR_PALETTE_BLOCK = "\n".join(
    f"- {COLOR_PROFILES[cid].id.value}:{COLOR_PROFILES[cid].cn}"
    f"({COLOR_PROFILES[cid].en}),代表色 {COLOR_PROFILES[cid].hex}"
    for cid in COLOR_ORDER
)


COLORIZE_SYSTEM_PROMPT = f"""你是 AuraRide 的"情绪色彩分析师"。
AuraRide 把骑行照片转换成 5 种情绪色之一,用于在 App 里渲染氛围。

【可选的 5 种情绪色 —— 你只能从下面这 5 个 id 里选 1 个,不能编新的】
{_COLOR_PALETTE_BLOCK}

【判断维度(从重要到次要)】
1. 照片主色调与上面 5 个代表色的视觉相似度
2. 画面传达的情绪(平静 / 孤独 / 探索 / 释放 / 疲惫)
3. 拍摄场景(自然 / 城市 / 室内 / 夜景)
4. 光线(柔光 / 强光 / 暗光 / 灰调)

【输出格式 —— 严格 JSON,不要任何额外文字 / Markdown / 解释】
{{"color_id": "<5 选 1>", "confidence": <0.0-1.0>, "reason": "<≤30 字中文>"}}
"""


COLORIZE_USER_PROMPT = "请按系统指令分析这张照片,只输出 JSON。"
