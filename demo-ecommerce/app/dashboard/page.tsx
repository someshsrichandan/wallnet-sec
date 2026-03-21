import Link from "next/link";
import { redirect } from "next/navigation";

import { readServerSession } from "@/lib/server-auth";
import { findUserById } from "@/lib/demo-shop-store";
import EnableVisualPasswordButton from "./EnableVisualPasswordButton";

const MOCK_ORDERS = [
    {
        id: "ORD-29481",
        items: "Running Shoes Pro X × 1",
        total: "₹4,999",
        status: "Delivered",
        statusClass: "delivered",
        date: "15 Feb 2026",
        emoji: "👟",
    },
    {
        id: "ORD-29102",
        items: "Mechanical Keyboard RGB × 1, Silicone Phone Case × 2",
        total: "₹4,097",
        status: "In Transit",
        statusClass: "transit",
        date: "12 Feb 2026",
        emoji: "💻",
    },
    {
        id: "ORD-28756",
        items: "ANC Headphones 700 × 1",
        total: "₹8,999",
        status: "Delivered",
        statusClass: "delivered",
        date: "3 Feb 2026",
        emoji: "🎧",
    },
];

type Props = {
    searchParams: Promise<{ enrolled?: string; enrollError?: string; verified?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
    const session = await readServerSession();
    if (!session) redirect("/login?error=Please%20sign%20in%20first");

    const user = await findUserById(session.userId);
    const params = await searchParams;

    return (
        <section className="page">
            {/* Alerts */}
            {params.enrolled === "1" && (
                <div className="status success" style={{ marginBottom: "1rem" }}>
                    ✓ Visual password {user?.visualEnabled ? "updated" : "enabled"} successfully!
                </div>
            )}
            {params.verified === "1" && (
                <div className="status success" style={{ marginBottom: "1rem" }}>
                    ✓ Visual authentication passed. Session started.
                </div>
            )}
            {params.enrollError && (
                <div className="status error" style={{ marginBottom: "1rem" }}>
                    Visual setup failed: {decodeURIComponent(params.enrollError)}
                </div>
            )}

            <div className="dash-grid">
                {/* Left sidebar — account info */}
                <div className="dash-sidebar">
                    <div className="dash-sidebar-header">
                        <h3>Hello, {session.fullName.split(" ")[0]}!</h3>
                        <p>{session.email}</p>
                    </div>
                    <div className="dash-sidebar-body">
                        <div className="meta-list">
                            <div>
                                <strong>Name</strong>
                                <span>{session.fullName}</span>
                            </div>
                            <div>
                                <strong>Customer ID</strong>
                                <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                                    {session.partnerUserId}
                                </span>
                            </div>
                            <div>
                                <strong>Visual Password</strong>
                                <span
                                    style={{
                                        color: user?.visualEnabled ? "var(--good)" : "var(--danger)",
                                        fontWeight: 700,
                                    }}
                                >
                                    {user?.visualEnabled ? "✓ Active" : "✗ Not set up"}
                                </span>
                            </div>
                        </div>

                        {!user?.visualEnabled && (
                            <div
                                className="status warn"
                                style={{ marginTop: "1rem", fontSize: "0.82rem" }}
                            >
                                Enable visual password for phishing-resistant security on every
                                login.
                            </div>
                        )}

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                marginTop: "1rem",
                            }}
                        >
                            <EnableVisualPasswordButton
                                mode={user?.visualEnabled ? "re-enroll" : "enroll"}
                            />
                            <Link
                                className="btn btn-muted"
                                href="/logout"
                                style={{ justifyContent: "center" }}
                            >
                                Logout
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right main content */}
                <div className="dash-main">
                    {/* Order summary cards */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "1rem",
                        }}
                    >
                        <div
                            className="dash-card"
                            style={{ textAlign: "center", padding: "1.2rem" }}
                        >
                            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--brand)" }}>
                                {MOCK_ORDERS.length}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                Total Orders
                            </div>
                        </div>
                        <div
                            className="dash-card"
                            style={{ textAlign: "center", padding: "1.2rem" }}
                        >
                            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--good)" }}>
                                {MOCK_ORDERS.filter((o) => o.status === "Delivered").length}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                Delivered
                            </div>
                        </div>
                        <div
                            className="dash-card"
                            style={{ textAlign: "center", padding: "1.2rem" }}
                        >
                            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                                {MOCK_ORDERS.filter((o) => o.status === "In Transit").length}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                In Transit
                            </div>
                        </div>
                    </div>

                    {/* Recent orders */}
                    <div className="dash-card">
                        <div className="dash-card-header">My Orders</div>
                        <div className="orders-list">
                            {MOCK_ORDERS.map((order) => (
                                <div className="order-row" key={order.id}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                        }}
                                    >
                                        <span style={{ fontSize: "1.8rem" }}>{order.emoji}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                                {order.items}
                                            </div>
                                            <div className="order-id">
                                                {order.id} &middot; {order.date}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "0.75rem",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                                            {order.total}
                                        </span>
                                        <span className={`order-status ${order.statusClass}`}>
                                            {order.status === "Delivered" ? "● " : "◐ "}
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p style={{ color: "var(--muted)", fontSize: "0.78rem", textAlign: "center" }}>
                        These are mock orders for demo purposes.
                    </p>
                </div>
            </div>
        </section>
    );
}
