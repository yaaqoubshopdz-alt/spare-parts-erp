"""
Bolbul ERP — Agent Runner
Quick CLI to run the multi-agent system.
Usage: python run.py "أضف جدول الموردين"
"""
import sys
import os

# Ensure we can import from src
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.agents import run_workflow, print_results, TEAM

def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║   🏗️  Bolbul ERP — Multi-Agent Engineering System       ║
║                                                          ║
║   الوكلاء:                                               ║
║     🔷 Atlas  — المعماري (Architecture Guardian)         ║
║     🔶 Raz    — خبير البيانات (SQLite Expert)            ║
║     🟢 Echo   — المبرمج (Implementation Engineer)        ║
║     🟣 Arya   — المراجع (QA & UX Reviewer)               ║
║                                                          ║
║   التعاون: Atlas→Raz→Echo→Arya (تسلسلي مع تراكم السياق) ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        task = input("📋 أدخل المهمة (أو اتركه فارغ للخروج): ").strip()
        if not task:
            return
    
    print(f"\n🚀 بدء المهمة: {task}\n")
    results = run_workflow(task)
    print_results(results)

if __name__ == "__main__":
    main()
