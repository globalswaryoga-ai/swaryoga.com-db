#!/usr/bin/env python3
"""
Scenario: Nepal + Cash Deposit = Swar Yoga Workshop Income
"""

# INCOME
class_income = 270242
nepal_income = 60000
cash_income = 85000
light_bill = 4450
interest = 25
total_income = class_income + nepal_income + cash_income + light_bill + interest

# EXPENSES (without Mohan salary)
expenses_no_mohan = 530704

print("=" * 65)
print("  SCENARIO: Nepal Rs 60K + Cash Rs 85K → Workshop Income")
print("=" * 65)
print()
print("  INCOME:")
print(f"    Class Income (Bank)           Rs  {class_income:>10,}")
print(f"    Nepal Workshop Income         Rs  {nepal_income:>10,}  ← ADDED")
print(f"    Cash Swar Yoga Workshop       Rs  {cash_income:>10,}  ← ADDED")
print(f"    Light Bill + Interest         Rs  {light_bill + interest:>10,}")
print(f"    ──────────────────────────────────────────")
print(f"    TOTAL INCOME                  Rs  {total_income:>10,}")
print()
print("  POSITION WITH DIFFERENT MOHAN SALARY:")
print(f"  {'─' * 60}")
print(f"  {'Scenario':<30} {'Income':>10} {'Expense':>10} {'Result':>14}")
print(f"  {'─' * 60}")

scenarios = [
    ("Mohan Rs 30,000/mo", 360000),
    ("Mohan Rs 25,000/mo", 300000),
    ("Mohan Rs 20,000/mo", 240000),
    ("Mohan Rs 15,000/mo", 180000),
    ("Mohan Rs 10,000/mo", 120000),
    ("Mohan Rs 5,000/mo", 60000),
    ("Mohan Rs 0 (No salary)", 0),
]

for name, sal in scenarios:
    exp = expenses_no_mohan + sal
    net = total_income - exp
    if net >= 0:
        status = f"PROFIT {net:,}"
    else:
        status = f"LOSS {abs(net):,}"
    print(f"  {name:<30} {total_income:>10,} {exp:>10,} {status:>14}")

print(f"  {'─' * 60}")

# Break-even calculation
breakeven_salary = total_income - expenses_no_mohan
print()
print(f"  ═══════════════════════════════════════════════════")
print(f"  BREAK-EVEN MOHAN SALARY = Rs {breakeven_salary:,}/year")
print(f"                           = Rs {breakeven_salary // 12:,}/month")
print(f"  ═══════════════════════════════════════════════════")
print()

# Previous vs New comparison
print("  COMPARISON: Previous Income vs New Income")
print(f"  {'─' * 55}")
print(f"  Previous (no Nepal/Cash):  Rs  {class_income + light_bill + interest:>10,}")
print(f"  New (with Nepal + Cash):   Rs  {total_income:>10,}")
print(f"  Extra Income Added:        Rs  {nepal_income + cash_income:>10,}")
print(f"  {'─' * 55}")
print()

# With Mohan Rs 0 detailed
exp_zero = expenses_no_mohan
net_zero = total_income - exp_zero
print(f"  BEST CASE (Mohan Rs 0):")
print(f"    Income:   Rs {total_income:>10,}")
print(f"    Expenses: Rs {exp_zero:>10,}")
print(f"    LOSS:     Rs {abs(net_zero):>10,}")
print()
print(f"  WITH MOHAN Rs 10,000/mo:")
exp_10k = expenses_no_mohan + 120000
net_10k = total_income - exp_10k
print(f"    Income:   Rs {total_income:>10,}")
print(f"    Expenses: Rs {exp_10k:>10,}")
print(f"    LOSS:     Rs {abs(net_10k):>10,}")
