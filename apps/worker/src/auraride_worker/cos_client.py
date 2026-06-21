"""腾讯云 COS 极薄封装 —— 只暴露 "读对象成 bytes" 一个能力。

写入由 Go API 端的 STS 直传完成,worker 不写 COS。
真 SDK ``qcloud_cos.CosS3Client`` 较重,测试时用 ``StubCosClient`` 替换。
"""

from __future__ import annotations

from typing import Protocol


class CosClient(Protocol):
    def get_object_bytes(self, key: str) -> bytes: ...


class StubCosClient:
    """测试用 —— 用预置 dict 喂数据,避免触发真 SDK。"""

    def __init__(self, store: dict[str, bytes] | None = None) -> None:
        self._store = store or {}

    def put(self, key: str, data: bytes) -> None:
        self._store[key] = data

    def get_object_bytes(self, key: str) -> bytes:
        if key not in self._store:
            raise FileNotFoundError(f"COS object 不存在:{key}")
        return self._store[key]


def build_cos_client() -> CosClient:
    """生产:用 ``qcloud_cos`` 构造真 client。

    TODO(post-mvp): 真正接入 ``CosS3Client``,把 secret 从 ``Settings`` 注进去;
    现在 worker 启动入口走 ``StubCosClient``,等服务器装好 + DASHSCOPE key 就位再切。
    """
    # 延迟 import 避免测试环境必装 cos-python-sdk-v5
    from qcloud_cos import CosConfig, CosS3Client  # type: ignore[import-not-found]

    from .config import get_settings

    settings = get_settings()
    config = CosConfig(
        Region=settings.cos_region,
        SecretId=settings.cos_secret_id,
        SecretKey=settings.cos_secret_key,
    )
    raw = CosS3Client(config)
    bucket = settings.cos_bucket

    class _RealClient:
        def get_object_bytes(self, key: str) -> bytes:
            resp = raw.get_object(Bucket=bucket, Key=key)
            return resp["Body"].get_raw_stream().read()

    return _RealClient()
