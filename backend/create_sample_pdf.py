import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_incident_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#090d16"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#b8860b"),
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=5,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )

    code_style = ParagraphStyle(
        "LogCode",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#dc2626"),
        backColor=colors.HexColor("#fef2f2"),
        borderPadding=5,
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("TASKFORCE AUTONOMOUS INCIDENT DOSSIER", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "Production Outage: Redis Cluster Split-Brain & Cross-AZ Egress Saturation", title_style
        )
    )
    story.append(Spacer(1, 6))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Incident ID:</b> INC-2026-9812", body_style),
            Paragraph("<b>Severity:</b> P0 / Critical", body_style),
            Paragraph("<b>Impacted Systems:</b> Redis 7.2, AWS eu-west-1", body_style),
        ],
        [
            Paragraph("<b>Author:</b> Cloud Infrastructure Team", body_style),
            Paragraph("<b>Detection:</b> Prometheus Alert #441", body_style),
            Paragraph("<b>Status:</b> Root Cause Under Investigation", body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[170, 150, 210])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))
    story.append(
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=10)
    )

    # 1. Executive Narrative
    story.append(Paragraph("1. Executive Incident Narrative", heading_style))
    story.append(
        Paragraph(
            "At 04:12 UTC, during an automated scale-up of checkout API pods across AWS availability zones "
            "(eu-west-1a, 1b, and 1c), a transient inter-AZ network partition lasting 14 seconds isolated "
            "the primary Redis cluster master (redis-node-01). The cluster failure detection threshold "
            "(cluster-node-timeout) was configured at 10,000 ms, triggering an automatic failover election "
            "in eu-west-1b while the original master in eu-west-1a continued accepting checkout write requests. "
            "This caused an unrecoverable split-brain condition with divergent keyspaces, duplicate order UUIDs, "
            "and an immediate 400x spike in cross-AZ network egress costs ($22,400/hr) as replica sync storms cascaded.",
            body_style,
        )
    )
    story.append(Spacer(1, 8))

    # 2. Observed Failure Telemetry & Logs
    story.append(Paragraph("2. Failure Telemetry & Stack Logs", heading_style))
    telemetry_data = [
        ["Timestamp (UTC)", "Node / Host", "Metric / Error Code", "Observed Value"],
        [
            "04:12:14.210",
            "redis-node-01 (1a)",
            "cluster-node-timeout",
            "State: FAIL? (14,210 ms elapsed)",
        ],
        [
            "04:12:15.890",
            "redis-node-02 (1b)",
            "FAILOVER_ELECTION",
            "Promoted to Master (Quorum: 2/3)",
        ],
        [
            "04:12:19.440",
            "api-gateway-04",
            "HTTP 500 LockTimeout",
            "Key: lock:order:SKU-9921-X expired",
        ],
        [
            "04:12:28.110",
            "nat-gateway-1a",
            "Cross-AZ Egress Bytes",
            "6.8 Gbps sustained (Nominal: 45 Mbps)",
        ],
        [
            "04:13:02.000",
            "billing-reconciliation",
            "DuplicateOrderException",
            "UUID 88a1b2-cf49 dedup mismatch",
        ],
    ]
    telemetry_table = Table(telemetry_data, colWidths=[90, 120, 140, 180])
    telemetry_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(telemetry_table)
    story.append(Spacer(1, 8))

    # Log snippet
    story.append(Paragraph("Observed Redis Cluster Sentinel Log Trace:", body_style))
    story.append(Spacer(1, 3))
    story.append(
        Paragraph(
            "[121:M 17 Nov 04:12:15.112 #] +failover-state-select-slave master redis-cluster-prod 10.0.12.44 6379<br/>"
            "[121:M 17 Nov 04:12:15.228 #] +selected-slave slave 10.0.24.89:6379<br/>"
            "[121:M 17 Nov 04:12:16.002 *] Sentinel failover approved by 2/3 quorums. Switching master.<br/>"
            "[842:C 17 Nov 04:12:22.450 #] WARNING: Node 10.0.12.44 still marked self as MASTER with 1,420 connected clients!<br/>"
            "[842:C 17 Nov 04:12:23.100 #] Full resync requested by 8 replicas simultaneously! Buffer overflow in replication backlog.",
            code_style,
        )
    )
    story.append(Spacer(1, 10))

    # 3. Specific Investigation Directives
    story.append(Paragraph("3. Specific Swarm Investigation Directives", heading_style))
    story.append(
        Paragraph(
            "The engineering leadership requires the Taskforce Autonomous Swarm to deliver:<br/>"
            "<b>A. Root Cause Analysis:</b> Mathematical and architectural breakdown of cluster quorum failure during transient network partitions.<br/>"
            "<b>B. Verified Production Fix:</b> Exact cluster configuration parameters (min-replicas-to-write, min-replicas-max-lag, cluster-node-timeout), "
            "plus Python/FastAPI distributed lock guard implementing Redlock with fence tokens.<br/>"
            "<b>C. Regression Assertion Suite:</b> Automated unit and boundary test matrix ensuring zero duplicate allocations when split-brain occurs.<br/>"
            "<b>D. Cloud FinOps Mitigation:</b> Egress routing rules and VPC peering configuration to eliminate multi-AZ NAT gateway billing spikes.",
            body_style,
        )
    )

    doc.build(story)
    print(f"Sample PDF created successfully at: {output_path}")


if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    target_path = os.path.join(out_dir, "sample_incident_report.pdf")
    generate_incident_pdf(target_path)
