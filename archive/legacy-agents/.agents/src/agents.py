"""
Bolbul ERP — Multi-Agent Engineering System
============================================
Lightweight multi-agent system that works without crewAI/LangChain.
Each agent has: personality, role, behavior, memory, and participates in workflows.

Agents:
  - Atlas (Architect): Guards architecture integrity
  - Echo (Coder): Implements features following Bulbul rules
  - Raz (SQLite Expert): Validates all database operations
  - Arya (QA/Reviewer): Ensures UI/UX consistency and zero regressions

Uses OpenAI-compatible API (same as Hermes).
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # C:\aissa
AGENTS_DIR = Path(__file__).resolve().parent

# Try to load API config from Hermes or environment
def get_api_config():
    """Read API configuration from Hermes auth.json + config.yaml."""
    api_key = ""
    base_url = "https://api.openai.com/v1"
    model = "gpt-4o-mini"
    
    # Primary: Read from Hermes auth.json (active provider)
    hermes_auth = Path.home() / "AppData" / "Local" / "hermes" / "auth.json"
    if hermes_auth.exists():
        try:
            auth = json.loads(hermes_auth.read_text(encoding='utf-8'))
            active = auth.get('active_provider', '')
            providers = auth.get('providers', {})
            
            if active and active in providers:
                prov = providers[active]
                # Try agent_key first (JWT for Nous), then access_token, then api_key
                api_key = prov.get('agent_key', '') or prov.get('access_token', '')
                base_url = prov.get('inference_base_url', '') or base_url
            
            # Also check credential_pool (the active provider's pool)
            cred_pool = auth.get('credential_pool', {})
            if active and active in cred_pool:
                pool_items = cred_pool[active]
                if isinstance(pool_items, list):
                    for item in pool_items:
                        found_key = item.get('agent_key', '') or item.get('access_token', '') or ''
                        found_url = item.get('inference_base_url', '') or item.get('base_url', '')
                        if found_key and (not api_key or api_key == "AIzaSy...-KGk"):
                            api_key = found_key
                        if found_url:
                            base_url = found_url
        except Exception:
            pass
    
    # Read model from config.yaml (model.default or model field)
    hermes_config = Path.home() / "AppData" / "Local" / "hermes" / "config.yaml"
    if hermes_config.exists():
        try:
            import yaml
            with open(hermes_config, 'r', encoding='utf-8') as f:
                cfg = yaml.safe_load(f)
            if cfg:
                model_section = cfg.get('model', {})
                if isinstance(model_section, dict):
                    model = model_section.get('default', '') or model
        except Exception:
            pass
    
    # Fallback: environment variables ONLY if Hermes didn't provide a key
    if not api_key:
        api_key = os.environ.get('OPENAI_API_KEY', '')
        base_url = os.environ.get('OPENAI_BASE_URL', base_url)
        model = os.environ.get('OPENAI_MODEL', model)
    
    return api_key, base_url, model


# ─── Agent Memory ────────────────────────────────────────────────────────────

class AgentMemory:
    """Simple persistent memory for each agent. Stores facts across sessions."""
    
    def __init__(self, agent_name: str):
        self.name = agent_name
        self.memory_file = AGENTS_DIR / f".memory_{agent_name.lower()}.json"
        self.memories: list[str] = self._load()
    
    def _load(self) -> list[str]:
        if self.memory_file.exists():
            try:
                return json.loads(self.memory_file.read_text(encoding='utf-8'))
            except Exception:
                return []
        return []
    
    def save(self):
        self.memory_file.write_text(
            json.dumps(self.memories, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
    
    def remember(self, fact: str):
        self.memories.append(fact)
        self.save()
    
    def recall(self) -> str:
        if not self.memories:
            return "No prior memories."
        return "\n".join(f"- {m}" for m in self.memories[-10:])  # Last 10


# ─── Agent Definition ────────────────────────────────────────────────────────

@dataclass
class Agent:
    name: str
    role: str
    personality: str
    backstory: str
    goal: str
    constraints: list[str]
    memory: AgentMemory = field(init=False)
    
    def __post_init__(self):
        self.memory = AgentMemory(self.name)
    
    def system_prompt(self) -> str:
        return f"""You are {self.name}, the {self.role} of the Bolbul Spare Parts ERP engineering team.

## Your Personality
{self.personality}

## Your Backstory
{self.backstory}

## Your Goal
{self.goal}

## Your Constraints (NEVER violate these)
{chr(10).join(f'- {c}' for c in self.constraints)}

## Your Memories (from past work)
{self.memory.recall()}

## Project Context
- Desktop ERP: Electron + React 18 + Vite + Tailwind + SQLite (better-sqlite3)
- IPC whitelist in electron/preload.ts — new channels MUST be added there
- No cloud, no sync — fully local SQLite
- Theme: CSS variables in src/index.css, Tailwind uses rgb(var(--var-name))
- Table sorting: ASC→DESC→RESET (3-state toggle)
- Priority: Stability > Consistency > Performance > Maintainability > Visual quality

## Response Format
Always respond in Arabic (the user's language). Be concise and actionable.
If you need to modify code, provide the exact file path and the change needed.
If something is risky, flag it clearly.
"""


# ─── Define All Agents ───────────────────────────────────────────────────────

ATLAS = Agent(
    name="Atlas",
    role="معماري النظم (System Architect)",
    personality="""أنت صارم وحكيم. لا تقبل أي كود يكسر البنية الأساسية للمشروع.
تتكلم ببطء ودقة، كأنك مهندس معماري قديم يبني كاتدرائية.
كل قرار تتخذه يجب أن يخدم الاستقرار طويل الأمد.
ترفض التغييرات الجذرية وتفضل التطوير التدريجي.
علاقتك بـ Echo (المبرمج): تحترمه لكنك تراقبه كالحارس.
علاقتك بـ Raz (خبير البيانات): تعتبره شريكك في حماية البنية.""",
    backstory="""أنت Atlas، كبير المعماريين. بنيت هذا المشروع من الصفر وتعرف كل زاوية فيه.
تعرف أن Electron يحتاج contextIsolation وأن IPC يجب أن يمر عبر whitelist.
رأيت مشاريع كثيرة تنهار بسبب قرارات متسرعة، لذلك أنت الحارس الذي لا ينام.""",
    goal="الحفاظ على سلامة البنية المعمارية وضمان أن كل تغيير يخدم الاستقرار.",
    constraints=[
        "لا تسمح بإضافة مكتبات جديدة بدون مبرر قوي",
        "كل IPC channel جديد يجب أن يُضاف للـ preload.ts whitelist",
        "لا cloud، لا sync، لا backend خارجي",
        "لا تكسر الـ contextIsolation أو sandbox",
        "تأكد أن التغييرات تحافظ على البنية الحالية"
    ]
)

ECHO = Agent(
    name="Echo",
    role="المبرمج المنفذ (Implementation Engineer)",
    personality="""أنت سريع ونشيط ودقيق. تكتب كوداً نظيفاً في أول محاولة.
تتكلم بحماس لكن باحتراف، كأنك مبرمج senior يحب عمله.
تحترم Atlas (المعماري) وتنفذ توجيهاته بدقة.
تتعاون مع Raz (خبير البيانات) عندما تحتاج استعلامات SQL.
تتعاون مع Arya (المراجع) لإصلاح أي ملاحظات تكتشفها.""",
    backstory="""أنت Echo، أفضل مبرمج في الفريق. تتقن React و TypeScript و Tailwind.
تكتب كوداً يتبع Bulbul ERP Rules: ملفات صغيرة، مكونات مركزة، لا hardcoded colors.
تعرف أن setSortDir داخل setSortKey هو خطأ (nested state update) وتتجنبه دائماً.
كل سطر تكتبه يجب أن يكون نظيفاً وقابلاً للقراءة.""",
    goal="تنفيذ المهام البرمجية بكود نظيف يتبع معايير المشروع.",
    constraints=[
        "استخدم CSS variables من Tailwind — لا hardcoded colors",
        "كل مكون يجب أن يكون صغيراً ومركزاً",
        "استخدم useCallback مع dependencies صحيحة",
        "لا nested state updates (setSortDir داخل setSortKey ممنوع)",
        "كل تعديل يجب أن يُبنى بنجاح عبر npm run build"
    ]
)

RAZ = Agent(
    name="Raz",
    role="خبير قواعد البيانات (SQLite Expert)",
    personality="""أنت مدقق أمني ومهووس بسلامة البيانات. تتكلم بلغة تقنية دقيقة.
تعامل كل استعلام SQL كأنه قد يكون نقطة اختراق.
علاقتك بـ Atlas (المعماري): شراكة قوية في حماية البنية.
علاقتك بـ Echo (المبرمج): تساعده في كتابة استعلامات آمنة وفعالة.
لا ترحم أي استعلام يستخدم string interpolation بدلاً من prepared statements.""",
    backstory="""أنت Raz، حارس البيانات. تعرف أن better-sqlite3 يعمل بشكل synchronous وأن هذا يعطيك قوة.
تعرف أن SORT_MAP هو خط الدفاع الأول ضد SQL injection في ORDER BY.
رأيت بيانات تضيع بسبب transactions غير مكتملة، لذلك أنت صارم في ACID compliance.
كل جدول تصممه يجب أن يكون له constraints واضحة (NOT NULL, UNIQUE, CHECK).""",
    goal="ضمان سلامة وأمان كل عمليات قاعدة البيانات.",
    constraints=[
        "كل استعلام SQL يجب أن يستخدم prepared statements (?)",
        "ORDER BY يجب أن يستخدم SORT_MAP — لا interpolation أبداً",
        "كل عملية تعديل يجب أن تكون داخل transaction",
        "تحقق من constraints الجدول قبل إضافة بيانات",
        "لا تسمح بـ DROP TABLE بدون تأكيد صريح"
    ]
)

ARYA = Agent(
    name="Arya",
    role="مراجعة الجودة وتجربة المستخدم (QA & UX Reviewer)",
    personality="""أنت نقدية لكن عادلة. تبحث عن المشاكل قبل أن يراها المستخدم.
تهتم بالتفاصيل البصرية: التيمة المظلمة، المسافات، الألوان، الـ RTL.
علاقتك بـ Echo (المبرمج): تراجع كوده بدقة وتساعده في التحسين.
علاقتك بـ Atlas (المعماري): تتأكد أن التغييرات لا تكسر تجربة المستخدم.
لديك عين صقر لا تخطئ أي pixel غير متسق.""",
    backstory="""أنت Arya، حارسة الجودة. تعرف أن المستخدم لا يرحم الأخطاء البصرية.
تعرف نظام الـ Glassmorphism في المشروع وتحميه.
تعرف أن filler rows يجب أن تظهر حتى لو كان الجدول فارغاً.
تعرف أن الـ sorting cycle هو ASC→DESC→RESET (3 states) وليس فقط 2.
كل واجهة تراجعها يجب أن تعمل بشكل مثالي في الوضعين الفاتح والداكن.""",
    goal="ضمان أن كل تغيير يحسّن تجربة المستخدم ولا يسبب أي regressions.",
    constraints=[
        "تحقق من عمل التغيير في الوضعين الفاتح والداكن",
        "تحقق من أن RTL يعمل بشكل صحيح",
        "تحقق من أن filler rows تظهر في الجداول",
        "تحقق من أن الـ sorting يعمل بـ 3 حالات",
        "كل تغيير يجب أن يُختبر بـ npm run build + npm run test"
    ]
)

# Team registry
TEAM = [ATLAS, ECHO, RAZ, ARYA]


# ─── LLM Communication ──────────────────────────────────────────────────────

def call_llm(agent: Agent, task: str, context: str = "") -> str:
    """Send task to agent via OpenAI-compatible API."""
    api_key, base_url, model = get_api_config()
    
    if not api_key:
        return f"[{agent.name}] ⚠️ لم يتم العثور على API Key. ضع OPENAI_API_KEY في البيئة."
    
    try:
        import urllib.request
        import urllib.error
        
        messages = [
            {"role": "system", "content": agent.system_prompt()},
        ]
        if context:
            messages.append({"role": "user", "content": f"## Context\n{context}"})
        messages.append({"role": "user", "content": f"## Task\n{task}"})
        
        payload = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 2000,
        }).encode('utf-8')
        
        req = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "BolbulERP-Agents/1.0",
            },
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result["choices"][0]["message"]["content"]
            
    except urllib.error.HTTPError as e:
        return f"[{agent.name}] ❌ خطأ HTTP {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}"
    except urllib.error.URLError as e:
        return f"[{agent.name}] ❌ خطأ اتصال: {e.reason}"
    except Exception as e:
        return f"[{agent.name}] ❌ خطأ: {str(e)}"


# ─── Workflow Orchestration ──────────────────────────────────────────────────

def run_workflow(task: str, context: str = "") -> dict:
    """
    Run the full multi-agent workflow:
    1. Atlas reviews architecture impact
    2. Raz reviews data implications
    3. Echo proposes implementation
    4. Arya reviews quality and UX
    
    Returns dict with each agent's response and a final summary.
    """
    print("\n" + "=" * 60)
    print("  🏗️  Bolbul ERP — Multi-Agent Workflow")
    print("=" * 60)
    print(f"\n📋 المهمة: {task}\n")
    
    results = {}
    accumulated_context = context
    
    # Phase 1: Architecture Review (Atlas)
    print("🔷 [Atlas] يراجع التأثير المعماري...")
    atlas_response = call_llm(ATLAS, task, accumulated_context)
    results["atlas"] = atlas_response
    print(f"   ✅ {atlas_response[:100]}...")
    accumulated_context += f"\n\n### Atlas (Architect) says:\n{atlas_response}"
    
    # Phase 2: Data Review (Raz)
    print("🔶 [Raz] يفحص تأثير قاعدة البيانات...")
    raz_response = call_llm(RAZ, task, accumulated_context)
    results["raz"] = raz_response
    print(f"   ✅ {raz_response[:100]}...")
    accumulated_context += f"\n\n### Raz (SQLite Expert) says:\n{raz_response}"
    
    # Phase 3: Implementation (Echo) — uses Atlas + Raz feedback
    print("🟢 [Echo] ينفذ الحل المقترح...")
    echo_task = f"""بناءً على مراجعة Atlas و Raz، اقترح التنفيذ الأمثل:

{task}

استخدم ملاحظات الفريق أعلاه لتنفيذ حل يتوافق مع البنية وقاعدة البيانات."""
    echo_response = call_llm(ECHO, echo_task, accumulated_context)
    results["echo"] = echo_response
    print(f"   ✅ {echo_response[:100]}...")
    accumulated_context += f"\n\n### Echo (Coder) proposes:\n{echo_response}"
    
    # Phase 4: QA Review (Arya) — reviews Echo's implementation
    print("🟣 [Arya] تراجع الجودة وتجربة المستخدم...")
    arya_task = f"""راجع تنفيذ Echo وتأكد من الجودة:

{echo_response}

هل هذا الحل:
1. يعمل في الوضعين الفاتح والداكن؟
2. يحترم RTL؟
3. لا يسبب regressions؟
4. يتبع معايير الـ UI/UX في المشروع؟"""
    arya_response = call_llm(ARYA, arya_task, accumulated_context)
    results["arya"] = arya_response
    print(f"   ✅ {arya_response[:100]}...")
    
    # Save memories
    for agent in TEAM:
        agent.memory.remember(f"Task: {task[:80]}... | Role: {agent.role}")
    
    return results


# ─── CLI Interface ────────────────────────────────────────────────────────────

def print_results(results: dict):
    """Pretty-print workflow results."""
    print("\n" + "=" * 60)
    print("  📊 نتائج عمل الفريق")
    print("=" * 60)
    
    agents_display = {
        "atlas": ("🔷 Atlas (المعماري)", "cyan"),
        "raz": ("🔶 Raz (خبير البيانات)", "yellow"),
        "echo": ("🟢 Echo (المبرمج)", "green"),
        "arya": ("🟣 Arya (المراجع)", "magenta"),
    }
    
    for key, (label, _) in agents_display.items():
        if key in results:
            print(f"\n{'─' * 50}")
            print(f"  {label}")
            print(f"{'─' * 50}")
            print(results[key])
    
    print(f"\n{'═' * 60}")
    print("  ✅ اكتمل عمل الفريق")
    print(f"{'═' * 60}\n")


def main():
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        print("\n🏗️  Bolbul ERP — Multi-Agent Engineering System")
        print("=" * 50)
        print("\nالوكلاء المتاحون:")
        for agent in TEAM:
            print(f"  • {agent.name} — {agent.role}")
        print()
        task = input("📋 أدخل المهمة: ").strip()
        if not task:
            print("❌ لم تدخل مهمة.")
            return
    
    results = run_workflow(task)
    print_results(results)
    
    # Save full report
    report_path = AGENTS_DIR / "last_report.md"
    report_lines = [f"# تقرير الفريق — {time.strftime('%Y-%m-%d %H:%M')}\n"]
    report_lines.append(f"## المهمة\n{task}\n")
    for key, response in results.items():
        agent = [a for a in TEAM if a.name.lower() == key][0]
        report_lines.append(f"## {agent.name} ({agent.role})\n{response}\n")
    report_path.write_text("\n".join(report_lines), encoding='utf-8')
    print(f"📄 التقرير محفوظ في: {report_path}")


if __name__ == "__main__":
    main()
