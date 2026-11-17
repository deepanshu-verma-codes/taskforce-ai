import asyncio
import os

from sqlalchemy import delete

from app.database import AsyncSessionLocal, init_db
from app.models import AgentLog, AgentRun, EvaluationMetric, Problem
from app.schemas import ProblemCreate
from app.services.auth_service import get_user_by_username
from app.services.problem_service import create_problem

DIVERSE_PROBLEMS = [
    # ── Cycle 1 ─────────────────────────────────────────────────────────────
    # 1. IT / Distributed Systems
    ProblemCreate(
        title="Distributed Lock Starvation & Double-Allocation in High-Concurrency Flash Sale",
        description=(
            "Under 12,000 requests/sec, concurrent checkout requests for identical inventory SKUs trigger "
            "Redis distributed lock timeouts and PostgreSQL row lock deadlocks. Transactions acquire locks "
            "in non-deterministic order, causing HTTP 500 errors and duplicate stock deduction."
        ),
        language="it",
        agent_count=4,
    ),
    # 2. Healthcare / Acute Care & Triage
    ProblemCreate(
        title="Sudden Throbbing Migraine with Visual Scotoma & Acute Nausea",
        description=(
            "32-year-old developer experiencing sudden severe unilateral throbbing headache, shimmering zigzag "
            "visual scotoma (aura), photophobia, and nausea after 12 hours of screen exposure and dehydration. "
            "Need emergency red-flag assessment, safe positioning, and non-narcotic first-aid relief protocol."
        ),
        language="healthcare",
        agent_count=3,
    ),
    # 3. Automobile / Powertrain & Turbo Systems
    ProblemCreate(
        title="Turbocharger Wastegate Actuator Sticking & Boost Pressure Loss Under Load",
        description=(
            "2022 turbocharged direct-injection vehicle stutters and loses boost pressure above 3,500 RPM. "
            "OBD-II telemetry reports DTC P0299 (Turbocharger Underboost) and MAP sensor reading 9.1 psi (nominal 19.5 psi). "
            "Need mechanical isolation of wastegate solenoid vs boost leak, vacuum testing steps, and repair checklist."
        ),
        language="automobile",
        agent_count=3,
    ),
    # 4. Finance / Quantitative Risk & Liquidity
    ProblemCreate(
        title="Portfolio Value-at-Risk (VaR) Spike & Liquidity Contagion During Market Volatility",
        description=(
            "Multi-asset hedge fund portfolio experiences 4.2x 99% 1-day VaR expansion during sudden market volatility. "
            "Fixed-income basis trades suffer margin calls while high-yield corporate bond bid-ask spreads widen 80 bps. "
            "Formulate dynamic delta hedging strategy, liquidity stress-test simulation, and margin mitigation steps."
        ),
        language="finance",
        agent_count=4,
    ),
    # 5. Math / Optimization & Matrix Algebra
    ProblemCreate(
        title="Constrained Portfolio Optimization: Risk-Parity Frontier with Ledoit-Wolf Shrinkage",
        description=(
            "Mathematical derivation and numerical algorithm for an N-asset portfolio subject to no-shorting "
            "constraints (w_i >= 0, sum w_i = 1) minimizing total portfolio variance. Sample covariance matrix "
            "is ill-conditioned (N=500 assets, T=250 observations). Formulate Ledoit-Wolf shrinkage estimator "
            "and solve the quadratic programming Lagrangian system."
        ),
        language="mathematics",
        agent_count=3,
    ),
    # ── Cycle 2 ─────────────────────────────────────────────────────────────
    # 6. IT / Cloud Infrastructure & FinOps
    ProblemCreate(
        title="Kubernetes Pod Eviction Storm & Unbounded Multi-Region Egress Cost Spike",
        description=(
            "Cross-region microservice communication in AWS/GCP triggered an unexpected $18,000/day data transfer egress "
            "spike. Node memory pressure triggers cascading OOM evictions of stateful Redis replica pods, forcing "
            "continuous cross-AZ snapshot syncs across public Internet gateways."
        ),
        language="it",
        agent_count=4,
    ),
    # 7. Healthcare / Respiratory & Pulmonology
    ProblemCreate(
        title="Pediatric Acute Wheezing & Severe Bronchospasm First-Response Triage",
        description=(
            "6-year-old child presents with sudden onset expiratory wheezing, subcostal retractions, respiratory rate of 38 bpm, "
            "and oxygen saturation of 91% on room air following viral upper respiratory infection. Provide immediate triage "
            "escalation criteria, bronchodilator spacer protocol, and emergency department transfer triggers."
        ),
        language="healthcare",
        agent_count=3,
    ),
    # 8. Automobile / Transmission & Drivetrain
    ProblemCreate(
        title="Dual-Clutch Automatic Transmission Shift Shudder & Solenoid Circuit DTC P0750",
        description=(
            "7-speed dual-clutch transmission exhibits violent shuddering when accelerating from a stop and delay engaging "
            "odd gears (1st, 3rd). Transmission Control Module logs DTC P0750 (Shift Solenoid A Malfunction) with fluid temperature "
            "at 112°C. Provide diagnostic flow chart, solenoid resistance checks, and clutch pack adaptation reset procedures."
        ),
        language="automobile",
        agent_count=3,
    ),
    # 9. Finance / High-Frequency Trading & Market Microstructure
    ProblemCreate(
        title="High-Frequency Trading Feed Handler TCP Drop & Microsecond Arbitrage Drift",
        description=(
            "Direct Market Data feed handler drops multicast UDP packets during exchange opening auctions, resulting in "
            "stale limit order book state and 140-microsecond execution latency slippage. Analyze kernel ring buffer "
            "overruns, CPU core affinity pinning, and zero-copy DPDK packet processing solutions."
        ),
        language="finance",
        agent_count=4,
    ),
    # 10. Math / Fluid Dynamics & Partial Differential Equations
    ProblemCreate(
        title="Boundary Layer Navier-Stokes Numerical Stability in Computational Aerodynamics",
        description=(
            "Incompressible Navier-Stokes solver using Crank-Nicolson time discretization develops non-physical numerical "
            "oscillations near aerodynamic boundary layers at Reynolds number Re = 10^6. Derive von Neumann stability analysis, "
            "implement streamline upwind Petrov-Galerkin (SUPG) stabilization, and ensure conservation of vorticity."
        ),
        language="mathematics",
        agent_count=3,
    ),
    # ── Cycle 3 ─────────────────────────────────────────────────────────────
    # 11. IT / Database Engineering
    ProblemCreate(
        title="PostgreSQL Write-Ahead Log (WAL) Disk Saturation During Concurrent Index Rebuild",
        description=(
            "Running REINDEX CONCURRENTLY on a 450GB partitioned table causes WAL generation to outpace archive throughput. "
            "Primary database storage reaches 93% disk utilization, threatening read-only failover, replication slot "
            "invalidation, and replication lag exceeding 50 minutes."
        ),
        language="it",
        agent_count=4,
    ),
    # 12. Healthcare / Pharmacology & Drug Interactions
    ProblemCreate(
        title="Warfarin Anticoagulation Drug Interaction with Concomitant Antibiotic Therapy",
        description=(
            "68-year-old atrial fibrillation patient on long-term warfarin (target INR 2.0-3.0) is prescribed ciprofloxacin "
            "for acute bacterial cystitis. Routine bloodwork 4 days later reveals supratherapeutic INR of 7.2 with minor epistaxis. "
            "Provide clinical protocol for CYP2C9/CYP1A2 enzyme inhibition reversal, vitamin K1 dosage, and anticoagulation stabilization."
        ),
        language="healthcare",
        agent_count=3,
    ),
    # 13. Automobile / EV Battery Engineering & Thermal Management
    ProblemCreate(
        title="Lithium-Ion EV Traction Battery Thermal Runaway & Cell Differential Voltage Fault",
        description=(
            "800V electric vehicle battery management system (BMS) flags Cell Module 4 with a 180mV voltage delta and thermal "
            "gradient of 14°C above neighboring modules under DC fast charging (250kW). Emergency contactor opens unexpectedly. "
            "Provide root-cause diagnosis (dendrite formation vs cooling plate blockage), thermal runaway prevention, and safety triage."
        ),
        language="automobile",
        agent_count=4,
    ),
    # 14. Finance / Banking & Credit Underwriting
    ProblemCreate(
        title="Credit Default Risk Underwriting: Basel III Capital Adequacy Stress Testing",
        description=(
            "Commercial bank portfolio of $1.8B mid-market corporate loans faces macroeconomic downturn scenario. "
            "Expected default frequency (EDF) increases by 240 bps across cyclical sectors. Model transition probability "
            "matrices, calculate risk-weighted assets (RWA), and formulate CET1 capital buffer replenishment strategy."
        ),
        language="finance",
        agent_count=3,
    ),
    # 15. Math / Stochastic Calculus & Differential Equations
    ProblemCreate(
        title="Stochastic Differential Equation Solution for Black-Scholes Greeks Hedging Drift",
        description=(
            "Derive analytical solutions for second-order Greeks (Gamma, Vanna, Volga) under local volatility SDE: "
            "dS_t = r S_t dt + sigma(S_t, t) S_t dW_t. Address boundary singularities at zero strike and short maturities, "
            "and establish numerical convergence bounds for finite-difference parabolic PDE schemes."
        ),
        language="mathematics",
        agent_count=3,
    ),
    # ── Cycle 4 ─────────────────────────────────────────────────────────────
    # 16. IT / Frontend & Runtime Concurrency
    ProblemCreate(
        title="React 19 Infinite Re-Render Loop & Main-Thread Lock in Live Telemetry Grid",
        description=(
            "High-frequency Server-Sent Events stream causes the dashboard table to lock the browser main thread "
            "at 100% CPU. A useEffect hook instantiates a new options object dependency on each render, and an "
            "un-memoized sorting filter recalculates 5,000 rows synchronously on every micro-tick."
        ),
        language="it",
        agent_count=3,
    ),
    # 17. Healthcare / Emergency Medicine & Allergy
    ProblemCreate(
        title="Acute Anaphylactic Food Reaction with Progressive Dyspnea & Hypotension",
        description=(
            "24-year-old diner ingests hidden peanut paste; develops rapid generalized urticaria, bilateral facial angioedema, "
            "stridor, and blood pressure drop to 82/50 mmHg within 8 minutes. Outline immediate intramuscular epinephrine "
            "weight-based dosage, airway preservation steps, fluid resuscitation protocol, and biphasic reaction monitoring."
        ),
        language="healthcare",
        agent_count=3,
    ),
    # 18. Automobile / Chassis & Steering Systems
    ProblemCreate(
        title="Electric Power Steering (EPS) Torque Sensor Signal Failure & Steering Pull",
        description=(
            "Vehicle experiences sudden intermittent steering assist drop and aggressive leftward steering wheel torque pull "
            "during low-speed parking maneuvers. EPS controller stores DTC C1511 (Torque Sensor Main Signal Fault). "
            "Isolate optoelectronic vs hall-effect sensor degradation, wiring harness resistance drop, and ECU calibration reset."
        ),
        language="automobile",
        agent_count=3,
    ),
    # 19. Finance / Derivatives & Currency Hedging
    ProblemCreate(
        title="Cross-Currency Basis Swap Valuation & Negative Interest Rate Curve Inversion",
        description=(
            "Multinational enterprise must hedge a 5-year €250M bond issue into USD liabilities amidst EUR/USD cross-currency "
            "basis widening to -35 bps. Model forward curve construction, collateralized CSA discount curves (SOFR vs ESTR), "
            "and quantify mark-to-market credit value adjustment (CVA) risks."
        ),
        language="finance",
        agent_count=4,
    ),
    # 20. Math / Graph Theory & Combinatorics
    ProblemCreate(
        title="Spectral Graph Theory: Graph Laplacian Partitioning for Community Detection",
        description=(
            "Analyze large sparse network G=(V,E) with |V|=50,000 nodes. Compute the second smallest eigenvalue (Fiedler value) "
            "and associated eigenvector of normalized graph Laplacian L_sym = D^(-1/2) L D^(-1/2). Formulate Cheeger's inequality "
            "bounds for minimal conductance cuts and construct Lanczos iterative eigensolver."
        ),
        language="mathematics",
        agent_count=3,
    ),
    # ── Cycle 5 ─────────────────────────────────────────────────────────────
    # 21. IT / Event Streaming & Messaging
    ProblemCreate(
        title="Kafka Partition Skew & Consumer Group Rebalance Cascades During Traffic Bursts",
        description=(
            "Apache Kafka cluster with 64 partitions suffers hot-partition bottlenecks due to uneven customer ID hashing keys. "
            "Individual consumer lag exceeds 400,000 messages, triggering heartbeat timeouts and cascading rebalance storms "
            "that freeze topic consumption across all subscriber microservices."
        ),
        language="it",
        agent_count=4,
    ),
    # 22. Healthcare / Endocrinology & Critical Care
    ProblemCreate(
        title="Diabetic Ketoacidosis (DKA) Triage: Hyperglycemia, Tachypnea & Ketone Elevation",
        description=(
            "19-year-old with Type 1 Diabetes presents with blood glucose 480 mg/dL, arterial blood pH 7.15, serum beta-hydroxybutyrate "
            "5.8 mmol/L, Kussmaul breathing, and severe dehydration. Establish isotonic saline fluid repletion schedule, intravenous "
            "regular insulin protocol, potassium monitoring to prevent hypokalemic arrhythmia, and anion gap tracking."
        ),
        language="healthcare",
        agent_count=3,
    ),
    # 23. Automobile / Embedded Networks & Cyber-Physical Systems
    ProblemCreate(
        title="Controller Area Network (CAN Bus) Frame Collisions & Bus-Off Faults",
        description=(
            "High-speed 500 kbps automotive powertrain CAN bus enters continuous Bus-Off state under heavy engine load. "
            "Oscilloscope reveals ground potential offset of 1.4V and excessive signal reflection due to missing 120-ohm split "
            "termination resistor. Formulate physical layer differential voltage diagnostics and error-counter reset."
        ),
        language="automobile",
        agent_count=4,
    ),
    # 24. Finance / Venture Capital & Corporate Finance
    ProblemCreate(
        title="Venture Capital Term Sheet Liquidation Preference & Dilution Waterfalls",
        description=(
            "Founders evaluating a $15M Series B term sheet at $60M pre-money valuation with 2x participating preferred shares "
            "and a 15% post-money employee option pool expansion. Build exit distribution waterfall across $30M, $75M, and $180M "
            "liquidity scenarios; calculate non-participating conversion thresholds and net common shareholder dilution."
        ),
        language="finance",
        agent_count=3,
    ),
    # 25. Math / Nonlinear Constrained Optimization
    ProblemCreate(
        title="Constrained Nonlinear Optimization via Karush-Kuhn-Tucker (KKT) Conditions",
        description=(
            "Solve the non-convex optimization problem min f(x) subject to inequality constraints g_i(x) <= 0 and equality constraints "
            "h_j(x) = 0. Verify Linear Independence Constraint Qualification (LICQ), formulate primal-dual interior point barrier "
            "methods, and construct Hessian approximations via BFGS update equations."
        ),
        language="mathematics",
        agent_count=3,
    ),
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        print("Purging legacy problem entries and runs...")
        await db.execute(delete(AgentLog))
        await db.execute(delete(AgentRun))
        await db.execute(delete(EvaluationMetric))
        await db.execute(delete(Problem))
        await db.commit()

        print(
            f"Seeding {len(DIVERSE_PROBLEMS)} diverse engineering & real-world problems into SQLite..."
        )
        deepanshu = await get_user_by_username(db, "deepanshu_verma")
        target_user_id = deepanshu.id if deepanshu else None

        for p in DIVERSE_PROBLEMS:
            created = await create_problem(db, p, user_id=target_user_id)
            print(f"  + [{created.language.upper()}] {created.title} (ID: {created.id})")

        # 26. Attached PDF Problem with Qdrant Vector Storage
        pdf_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "sample_incident_report.pdf")
        )
        if os.path.exists(pdf_path):
            from app.services.rag_service import extract_text_from_file

            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            pdf_text, _ = extract_text_from_file("sample_incident_report.pdf", pdf_bytes)
            pdf_problem = ProblemCreate(
                title="Production Outage: Redis Cluster Split-Brain & Cross-AZ Egress Saturation",
                description=(
                    "P0 Production Incident: Transient 14-second AWS inter-AZ network partition triggered a dual-master "
                    "split-brain race in Redis 7.2 cluster. Replicas desynchronized across availability zones, generating a "
                    "400x cross-AZ egress bandwidth spike ($22,400/hr) and duplicate order deductions."
                ),
                language="it",
                agent_count=4,
                document_name="sample_incident_report.pdf",
                document_text=pdf_text,
            )
            created_pdf = await create_problem(db, pdf_problem, user_id=target_user_id)
            print(
                f"  + [PDF + QDRANT RAG] {created_pdf.title} (ID: {created_pdf.id}, Chunks: {created_pdf.rag_chunks_count})"
            )

        print(
            "\nAll problems successfully loaded in PENDING status! (25 in SQLite, 1 in Qdrant Vector DB)"
        )


if __name__ == "__main__":
    asyncio.run(seed())
