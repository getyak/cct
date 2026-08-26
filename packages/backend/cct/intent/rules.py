from __future__ import annotations

import re

from cct.models.domain import IntentResult

_RULES: list[tuple[str, list[str], float]] = [
    # English patterns
    ("debugging",     [r"bug|error|fix|crash|exception|traceback|stack.?trace|why.{0,20}fail|not.work"], 0.85),
    ("coding",        [r"implement|write|create.{0,15}(func|class|method|component|feature)|build.{0,15}(api|service|module)|refactor|add.{0,10}(function|method)"], 0.85),
    ("architecture",  [r"design|architect|scalab|trade.?off|pattern|structure|system|diagram|ADR"], 0.80),
    ("documentation", [r"document|readme|comment|explain.{0,15}code|wiki|changelog|docstring"], 0.80),
    ("review",        [r"review|audit|critique|check.{0,10}(code|pr|pull)|code quality"], 0.80),
    ("planning",      [r"plan|roadmap|todo|break.{0,10}down|sprint|ticket|issue|milestone"], 0.78),
    ("question",      [r"\bhow\b|\bwhat\b|\bwhy\b|\bwhen\b|\bwhere\b|\bwhich\b|\?$"]),
    # Chinese patterns
    ("debugging",     [r"报错|错误|异常|崩溃|修复|修bug|调试|堆栈|不工作|失败|出错"], 0.85),
    ("coding",        [r"实现|编写|写.{0,6}(函数|类|方法|组件|功能|接口|模块)|创建.{0,6}(函数|类|接口)|构建|重构|开发.{0,6}(功能|模块)|代码怎么写|算法"], 0.85),
    ("architecture",  [r"架构|设计.{0,6}(系统|方案|模式)|可扩展|权衡|结构|系统设计|数据库设计|高并发|分布式"], 0.80),
    ("documentation", [r"文档|注释|说明|readme|wiki|怎么写文档|接口文档|使用说明"], 0.80),
    ("review",        [r"代码审查|审查.{0,6}代码|审阅|检查.{0,6}代码|代码质量|优化建议"], 0.80),
    ("planning",      [r"计划|规划|任务|拆分|里程碑|路线图|需求|排期"], 0.78),
    ("question",      [r"如何|怎么|什么|为什么|哪里|哪个|是否|能否|可以吗|？$"]),
]

def classify(text: str) -> IntentResult:
    t = text.lower()
    best_intent, best_conf = "other", 0.0
    matched_keywords: list[str] = []

    for entry in _RULES:
        intent, patterns, *conf_override = entry
        conf_val = conf_override[0] if conf_override else 0.75
        for pat in patterns:
            found = re.findall(pat, t)
            if found:
                # findall returns tuples when pattern has groups; flatten to strings
                flat = [m if isinstance(m, str) else next((s for s in m if s), "") for m in found]
                flat = [s for s in flat if s]
                score = min(conf_val + 0.03 * (len(flat) - 1), 0.97)
                if score > best_conf:
                    best_intent, best_conf = intent, score
                matched_keywords.extend(flat[:3])
                break

    return IntentResult(
        primary=best_intent,
        confidence=round(best_conf, 3),
        classifier="rules",
        keywords=list(dict.fromkeys(matched_keywords))[:5],
    )
