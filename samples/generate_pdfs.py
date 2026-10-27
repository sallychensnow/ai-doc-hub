#!/usr/bin/env python3
"""Generate sample PDF files with tables for AI_PARSE_DOCUMENT testing."""

from fpdf import FPDF
import os

OUT_DIR = os.path.join(os.path.dirname(__file__))


def make_sales_report():
    pdf = FPDF()
    pdf.add_page()

    # Use built-in font (no CJK needed for this one)
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, "Q3 2026 Sales Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, "Prepared by: Finance Department  |  Date: 2026-09-10  |  Confidential", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(6)

    # KPI summary
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Executive Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    summary = [
        "Total Revenue: $12,450,000 (vs $10,800,000 Q2, +15.3% QoQ)",
        "Gross Margin: 72.1% (vs 70.5% Q2)",
        "New Customers: 48 enterprise accounts",
        "Net Revenue Retention: 118%",
        "Average Deal Size: $259,375",
    ]
    for line in summary:
        pdf.cell(0, 6, f"  - {line}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Revenue by region table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Revenue by Region", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    cols = [("Region", 40), ("Q2 Revenue", 30), ("Q3 Revenue", 30), ("Growth", 22), ("Target", 30), ("Attainment", 28)]
    for name, w in cols:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    rows = [
        ("North America", "$4,200,000", "$4,850,000", "+15.5%", "$4,500,000", "107.8%"),
        ("EMEA", "$2,800,000", "$3,200,000", "+14.3%", "$3,000,000", "106.7%"),
        ("APAC", "$2,100,000", "$2,600,000", "+23.8%", "$2,200,000", "118.2%"),
        ("China", "$1,200,000", "$1,350,000", "+12.5%", "$1,500,000", "90.0%"),
        ("LATAM", "$500,000", "$450,000", "-10.0%", "$600,000", "75.0%"),
        ("TOTAL", "$10,800,000", "$12,450,000", "+15.3%", "$11,800,000", "105.5%"),
    ]
    for row in rows:
        for i, (_, w) in enumerate(cols):
            style = "B" if row[0] == "TOTAL" else ""
            pdf.set_font("Helvetica", style, 9)
            pdf.cell(w, 7, row[i], border=1, align="C" if i > 0 else "L")
        pdf.ln()
    pdf.ln(6)

    # Top deals table
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Top 5 Deals Closed in Q3", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    deal_cols = [("Customer", 50), ("Industry", 30), ("Deal Size", 28), ("Products", 40), ("Sales Rep", 32)]
    for name, w in deal_cols:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    deals = [
        ("GlobalBank Corp", "Financial", "$1,200,000", "Enterprise + Cortex", "J. Smith"),
        ("MediHealth Inc", "Healthcare", "$890,000", "Enterprise + ML", "A. Chen"),
        ("AutoDrive Tech", "Automotive", "$750,000", "Enterprise", "M. Weber"),
        ("RetailMax Group", "Retail", "$620,000", "Standard + Search", "K. Tanaka"),
        ("EduCloud Ltd", "Education", "$480,000", "Enterprise", "L. Garcia"),
    ]
    for row in deals:
        for i, (_, w) in enumerate(deal_cols):
            pdf.cell(w, 7, row[i], border=1, align="C" if i > 1 else "L")
        pdf.ln()
    pdf.ln(6)

    # Pipeline forecast
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Q4 Pipeline Forecast", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    pipe_cols = [("Stage", 35), ("# Deals", 22), ("Value", 30), ("Weighted", 30), ("Avg Days", 25), ("Win Rate", 25)]
    for name, w in pipe_cols:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    pipeline = [
        ("Discovery", "32", "$8,400,000", "$840,000", "15", "10%"),
        ("Evaluation", "18", "$5,200,000", "$1,560,000", "28", "30%"),
        ("Proposal", "12", "$4,100,000", "$2,460,000", "42", "60%"),
        ("Negotiation", "8", "$3,200,000", "$2,560,000", "55", "80%"),
        ("Commit", "5", "$1,800,000", "$1,710,000", "68", "95%"),
        ("TOTAL", "75", "$22,700,000", "$9,130,000", "-", "-"),
    ]
    for row in pipeline:
        for i, (_, w) in enumerate(pipe_cols):
            style = "B" if row[0] == "TOTAL" else ""
            pdf.set_font("Helvetica", style, 9)
            pdf.cell(w, 7, row[i], border=1, align="C" if i > 0 else "L")
        pdf.ln()

    pdf.output(os.path.join(OUT_DIR, "sales_report_q3_2026.pdf"))
    print("Created: sales_report_q3_2026.pdf")


def make_expense_report():
    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Employee Expense Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)

    # Employee info
    pdf.set_font("Helvetica", "", 10)
    info = [
        ("Employee Name:", "Sally Chen"),
        ("Employee ID:", "EMP-20231105"),
        ("Department:", "Technical Support - China"),
        ("Report Period:", "August 1 - August 31, 2026"),
        ("Submission Date:", "September 5, 2026"),
        ("Manager:", "David Liu"),
        ("Cost Center:", "CC-4520-APAC-SUPPORT"),
    ]
    for label, val in info:
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(45, 6, label)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, val, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Expense table
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Expense Details", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 8)
    exp_cols = [("Date", 22), ("Category", 28), ("Description", 52), ("Currency", 18), ("Amount", 22), ("USD Equiv", 22), ("Receipt", 16)]
    for name, w in exp_cols:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    expenses = [
        ("08-03", "Travel", "Flight: Beijing-Shanghai (CA1515)", "CNY", "1,580", "$218.62", "Yes"),
        ("08-03", "Transport", "Airport taxi to hotel", "CNY", "156", "$21.60", "Yes"),
        ("08-03", "Hotel", "Shanghai Marriott (3 nights)", "CNY", "3,600", "$498.62", "Yes"),
        ("08-04", "Meals", "Client dinner - CloudTech team", "CNY", "1,280", "$177.24", "Yes"),
        ("08-05", "Meals", "Team lunch - support workshop", "CNY", "680", "$94.17", "Yes"),
        ("08-06", "Travel", "Flight: Shanghai-Beijing (MU5102)", "CNY", "1,420", "$196.55", "Yes"),
        ("08-12", "Software", "Postman Pro license (annual)", "USD", "144", "$144.00", "Yes"),
        ("08-15", "Training", "AWS Cert exam fee", "USD", "300", "$300.00", "Yes"),
        ("08-20", "Transport", "Didi rides (weekly total)", "CNY", "320", "$44.31", "Yes"),
        ("08-22", "Meals", "Customer site visit lunch", "CNY", "450", "$62.31", "Yes"),
        ("08-28", "Office", "USB-C hub + keyboard", "CNY", "580", "$80.28", "Yes"),
    ]
    for row in expenses:
        for i, (_, w) in enumerate(exp_cols):
            pdf.cell(w, 6, row[i], border=1, align="C" if i in (0, 3, 4, 5, 6) else "L")
        pdf.ln()

    # Totals
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 10)
    totals = [
        ("Total (CNY):", "CNY 10,066"),
        ("Total (USD direct):", "USD 444.00"),
        ("Grand Total (USD):", "USD 1,837.70"),
        ("Exchange Rate:", "1 USD = 7.22 CNY (Aug 2026 avg)"),
    ]
    for label, val in totals:
        pdf.cell(50, 7, label)
        pdf.set_font("Helvetica", "B" if "Grand" in label else "", 10)
        pdf.cell(0, 7, val, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 10)
    pdf.ln(4)

    # Category summary
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Summary by Category", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 9)
    for name, w in [("Category", 35), ("# Items", 20), ("Amount (USD)", 30), ("% of Total", 25)]:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    cats = [
        ("Travel", "2", "$415.17", "22.6%"),
        ("Hotel", "1", "$498.62", "27.1%"),
        ("Meals", "3", "$333.72", "18.2%"),
        ("Transport", "2", "$65.91", "3.6%"),
        ("Software", "1", "$144.00", "7.8%"),
        ("Training", "1", "$300.00", "16.3%"),
        ("Office", "1", "$80.28", "4.4%"),
    ]
    for row in cats:
        for i, w in enumerate([35, 20, 30, 25]):
            pdf.cell(w, 7, row[i], border=1, align="C" if i > 0 else "L")
        pdf.ln()

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, "Employee Signature: _____________________  Date: ___________", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Manager Approval:  _____________________  Date: ___________", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Finance Approval:  _____________________  Date: ___________", new_x="LMARGIN", new_y="NEXT")

    pdf.output(os.path.join(OUT_DIR, "expense_report_aug2026.pdf"))
    print("Created: expense_report_aug2026.pdf")


def make_inventory_report():
    pdf = FPDF()
    pdf.add_page("L")  # Landscape for wide table

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Warehouse Inventory Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, "Warehouse: Shanghai Pudong Distribution Center  |  Report Date: 2026-09-01  |  Manager: Chen Jie", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 8)
    inv_cols = [
        ("SKU", 22), ("Product Name", 48), ("Category", 24), ("Unit", 14),
        ("On Hand", 18), ("Reserved", 18), ("Available", 18), ("Reorder Pt", 18),
        ("Status", 18), ("Unit Cost", 20), ("Total Value", 24), ("Last Count", 22), ("Location", 16),
    ]
    for name, w in inv_cols:
        pdf.cell(w, 7, name, border=1, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 7)
    items = [
        ("SKU-001", "Laptop Dell XPS 15 9530", "Electronics", "EA", "156", "23", "133", "50", "OK", "$1,299", "$202,644", "2026-08-28", "A-01"),
        ("SKU-002", "Monitor LG 27UK850", "Electronics", "EA", "89", "12", "77", "30", "OK", "$449", "$39,961", "2026-08-28", "A-02"),
        ("SKU-003", "Keyboard Logitech MX Keys", "Peripherals", "EA", "234", "45", "189", "100", "OK", "$99", "$23,166", "2026-08-28", "B-01"),
        ("SKU-004", "Mouse Logitech MX Master", "Peripherals", "EA", "312", "67", "245", "100", "OK", "$89", "$27,768", "2026-08-28", "B-01"),
        ("SKU-005", "USB-C Hub Anker 7in1", "Accessories", "EA", "45", "8", "37", "50", "LOW", "$65", "$2,925", "2026-08-25", "B-03"),
        ("SKU-006", "Webcam Logitech C920", "Peripherals", "EA", "178", "15", "163", "80", "OK", "$69", "$12,282", "2026-08-28", "B-02"),
        ("SKU-007", "Headset Jabra Evolve2 75", "Audio", "EA", "67", "22", "45", "40", "WARN", "$279", "$18,693", "2026-08-28", "C-01"),
        ("SKU-008", "Docking Station Lenovo", "Accessories", "EA", "23", "5", "18", "25", "LOW", "$199", "$4,577", "2026-08-20", "A-03"),
        ("SKU-009", "Printer HP LaserJet Pro", "Office", "EA", "12", "3", "9", "10", "LOW", "$329", "$3,948", "2026-08-15", "D-01"),
        ("SKU-010", "Paper A4 (5000 sheets)", "Supplies", "BOX", "450", "80", "370", "200", "OK", "$32", "$14,400", "2026-08-28", "D-02"),
        ("SKU-011", "Toner HP 26X (Black)", "Supplies", "EA", "34", "10", "24", "30", "LOW", "$89", "$3,026", "2026-08-22", "D-02"),
        ("SKU-012", "Standing Desk Frame", "Furniture", "EA", "8", "2", "6", "10", "LOW", "$459", "$3,672", "2026-08-10", "E-01"),
        ("SKU-013", "Office Chair Steelcase", "Furniture", "EA", "15", "4", "11", "8", "OK", "$899", "$13,485", "2026-08-28", "E-02"),
        ("SKU-014", "Whiteboard 120x90cm", "Office", "EA", "22", "0", "22", "10", "OK", "$129", "$2,838", "2026-08-28", "E-03"),
        ("SKU-015", "Cable Cat6 (305m box)", "Network", "BOX", "18", "3", "15", "10", "OK", "$85", "$1,530", "2026-08-25", "F-01"),
    ]
    for row in items:
        for i, (_, w) in enumerate(inv_cols):
            pdf.cell(w, 6, row[i], border=1, align="C" if i >= 4 else "L")
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 7, "Summary:  Total SKUs: 15  |  Total Value: $374,915  |  LOW Stock Items: 5  |  WARN Items: 1", new_x="LMARGIN", new_y="NEXT")

    pdf.output(os.path.join(OUT_DIR, "inventory_report_sep2026.pdf"))
    print("Created: inventory_report_sep2026.pdf")


if __name__ == "__main__":
    make_sales_report()
    make_expense_report()
    make_inventory_report()
    print("Done! All PDFs generated.")
