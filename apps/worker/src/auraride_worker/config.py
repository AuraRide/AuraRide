"""运行时配置 —— 单一真相源 = 环境变量(由 dotenvx 或 systemd EnvironmentFile 注入)。

测试时直接构造 ``Settings(...)`` 即可,不依赖任何 .env 文件。
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """所有 env 字段集中在一处,业务代码只读 ``get_settings()``。"""

    model_config = SettingsConfigDict(
        env_file=None,  # 真值由 dotenvx / systemd 注入,不读文件
        case_sensitive=False,
        extra="ignore",
    )

    # --- 基础设施 ---
    postgres_url: str = Field(
        default="postgresql://auraride:changeme@127.0.0.1:5432/auraride",
        alias="POSTGRES_URL",
    )
    redis_url: str = Field(default="redis://127.0.0.1:6379/0", alias="REDIS_URL")

    # --- VLM(DashScope 通义千问 VL) ---
    dashscope_api_key: str = Field(default="", alias="DASHSCOPE_API_KEY")
    dashscope_vlm_model: str = Field(default="qwen-vl-plus", alias="DASHSCOPE_VLM_MODEL")

    # --- 腾讯云 COS ---
    cos_secret_id: str = Field(default="", alias="COS_SECRET_ID")
    cos_secret_key: str = Field(default="", alias="COS_SECRET_KEY")
    cos_region: str = Field(default="ap-shanghai", alias="COS_REGION")
    cos_bucket: str = Field(default="auraride-photos-1315627382", alias="COS_BUCKET")

    # --- 预算闸门(单位:人民币元) ---
    vlm_daily_budget_cny: float = Field(default=20.0, alias="VLM_DAILY_BUDGET_CNY")
    vlm_cost_per_call_cny: float = Field(default=0.015, alias="VLM_COST_PER_CALL_CNY")

    # --- 日志 ---
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_json: bool = Field(default=False, alias="LOG_JSON")

    @property
    def has_vlm_key(self) -> bool:
        """无 key 时染色链立刻降级,不要白白调 API。"""
        return bool(self.dashscope_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """模块级缓存。测试用 ``get_settings.cache_clear()`` 重置。"""
    return Settings()
