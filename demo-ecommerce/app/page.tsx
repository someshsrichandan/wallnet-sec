import Link from "next/link";

/* ─── Data ─── */

const BANNER_SLIDES = [
    {
        title: "Mega Electronics Sale",
        subtitle: "Up to 80% Off on Top Brands",
        cta: "Shop Now",
        bg: "linear-gradient(135deg, #0f766e 0%, #115e59 60%, #134e4a 100%)",
        emoji: "💻",
    },
    {
        title: "Fashion Fest",
        subtitle: "End of Season Sale — Extra 40% Off",
        cta: "Explore",
        bg: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
        emoji: "👗",
    },
    {
        title: "Home Makeover Days",
        subtitle: "Furniture, Décor & Kitchen — Min 50% Off",
        cta: "Browse",
        bg: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
        emoji: "🛋️",
    },
];

const TOP_DEALS = [
    { emoji: "📱", name: "Smartphones", offer: "Up to 40% Off", tag: "" },
    { emoji: "💻", name: "Laptops", offer: "From ₹29,990", tag: "Best Seller" },
    { emoji: "👟", name: "Sports Shoes", offer: "Min 50% Off", tag: "" },
    { emoji: "🎧", name: "Headphones", offer: "Up to 70% Off", tag: "Top Rated" },
    { emoji: "⌚", name: "Smart Watches", offer: "From ₹1,499", tag: "" },
    { emoji: "📷", name: "Cameras", offer: "Up to 30% Off", tag: "" },
    { emoji: "🖥️", name: "Monitors", offer: "From ₹8,999", tag: "" },
    { emoji: "🎮", name: "Gaming", offer: "Min 40% Off", tag: "" },
];

const ELECTRONICS = [
    {
        emoji: "📱",
        name: "iPhone 15 Pro",
        price: "₹1,34,900",
        oldPrice: "₹1,59,900",
        discount: "15% off",
        rating: "4.7",
        reviews: "45,302",
    },
    {
        emoji: "💻",
        name: "MacBook Air M3",
        price: "₹99,990",
        oldPrice: "₹1,14,900",
        discount: "13% off",
        rating: "4.8",
        reviews: "18,944",
    },
    {
        emoji: "🎧",
        name: "Sony WH-1000XM5",
        price: "₹24,990",
        oldPrice: "₹34,990",
        discount: "28% off",
        rating: "4.6",
        reviews: "23,094",
    },
    {
        emoji: "📷",
        name: "Canon EOS R50",
        price: "₹62,990",
        oldPrice: "₹79,995",
        discount: "21% off",
        rating: "4.5",
        reviews: "3,412",
    },
    {
        emoji: "🖥️",
        name: 'Dell UltraSharp 27"',
        price: "₹28,499",
        oldPrice: "₹39,999",
        discount: "28% off",
        rating: "4.4",
        reviews: "8,211",
    },
    {
        emoji: "⌚",
        name: "Galaxy Watch 6",
        price: "₹21,999",
        oldPrice: "₹29,999",
        discount: "26% off",
        rating: "4.3",
        reviews: "12,847",
    },
];

const FASHION = [
    {
        emoji: "👕",
        name: "Men's Casual Shirts",
        price: "₹599",
        oldPrice: "₹1,499",
        discount: "60% off",
        rating: "4.2",
        reviews: "34,102",
    },
    {
        emoji: "👗",
        name: "Women's Kurti Set",
        price: "₹799",
        oldPrice: "₹1,999",
        discount: "60% off",
        rating: "4.1",
        reviews: "28,503",
    },
    {
        emoji: "👟",
        name: "Running Shoes Pro",
        price: "₹2,499",
        oldPrice: "₹4,999",
        discount: "50% off",
        rating: "4.3",
        reviews: "12,847",
    },
    {
        emoji: "👜",
        name: "Leather Handbag",
        price: "₹1,299",
        oldPrice: "₹3,499",
        discount: "62% off",
        rating: "4.0",
        reviews: "5,670",
    },
    {
        emoji: "🕶️",
        name: "Polarised Aviators",
        price: "₹899",
        oldPrice: "₹2,999",
        discount: "70% off",
        rating: "4.2",
        reviews: "9,882",
    },
    {
        emoji: "🧢",
        name: "Snapback Cap",
        price: "₹349",
        oldPrice: "₹799",
        discount: "56% off",
        rating: "4.0",
        reviews: "3,214",
    },
];

const HOME_KITCHEN = [
    {
        emoji: "🛋️",
        name: "3-Seater Sofa",
        price: "₹12,999",
        oldPrice: "₹29,999",
        discount: "56% off",
        rating: "4.1",
        reviews: "6,204",
    },
    {
        emoji: "🍳",
        name: "Non-Stick Cookware Set",
        price: "₹1,499",
        oldPrice: "₹3,999",
        discount: "62% off",
        rating: "4.4",
        reviews: "15,302",
    },
    {
        emoji: "🧹",
        name: "Robot Vacuum",
        price: "₹8,999",
        oldPrice: "₹19,999",
        discount: "55% off",
        rating: "4.3",
        reviews: "4,811",
    },
    {
        emoji: "💡",
        name: "Smart LED Bulb (4-Pack)",
        price: "₹999",
        oldPrice: "₹1,999",
        discount: "50% off",
        rating: "4.5",
        reviews: "22,047",
    },
    {
        emoji: "🛏️",
        name: "Memory Foam Mattress",
        price: "₹7,499",
        oldPrice: "₹15,999",
        discount: "53% off",
        rating: "4.6",
        reviews: "11,382",
    },
    {
        emoji: "☕",
        name: "Espresso Machine",
        price: "₹4,999",
        oldPrice: "₹9,999",
        discount: "50% off",
        rating: "4.2",
        reviews: "7,519",
    },
];

const PROMO_BANNERS = [
    {
        title: "🔒 Visual Password Protected",
        sub: "Every login is phishing-resistant",
        bg: "linear-gradient(135deg, #0f766e, #115e59)",
    },
    {
        title: "🚚 Free Delivery",
        sub: "On orders above ₹499",
        bg: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    },
    {
        title: "💳 No-Cost EMI",
        sub: "On select products",
        bg: "linear-gradient(135deg, #0369a1, #075985)",
    },
    {
        title: "↩️ Easy Returns",
        sub: "30-day return policy",
        bg: "linear-gradient(135deg, #b45309, #92400e)",
    },
];

/* ─── Component ─── */

export default function HomePage() {
    return (
        <section className="fk-home">
            {/* Hero Banner Carousel */}
            <div className="fk-carousel">
                <div className="fk-carousel-track">
                    {BANNER_SLIDES.map((s, i) => (
                        <div key={i} className="fk-slide" style={{ background: s.bg }}>
                            <div className="fk-slide-content">
                                <span className="fk-slide-emoji">{s.emoji}</span>
                                <div>
                                    <h2>{s.title}</h2>
                                    <p>{s.subtitle}</p>
                                    <Link href="/register" className="btn btn-accent">
                                        {s.cta} →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="fk-carousel-dots">
                    {BANNER_SLIDES.map((_, i) => (
                        <span key={i} className={`fk-dot${i === 0 ? " active" : ""}`} />
                    ))}
                </div>
            </div>

            {/* Top Deals Strip */}
            <div className="fk-section">
                <div className="fk-section-head">
                    <div>
                        <h2>Top Deals</h2>
                        <p className="fk-section-sub">Handpicked deals just for you</p>
                    </div>
                    <Link href="/register" className="btn btn-primary btn-sm">
                        View All
                    </Link>
                </div>
                <div className="fk-hscroll">
                    {TOP_DEALS.map((d) => (
                        <div key={d.name} className="fk-deal-card">
                            {d.tag && <span className="fk-deal-tag">{d.tag}</span>}
                            <span className="fk-deal-emoji">{d.emoji}</span>
                            <h4>{d.name}</h4>
                            <p className="fk-deal-offer">{d.offer}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Promo Banner Strip */}
            <div className="fk-promo-strip">
                {PROMO_BANNERS.map((p, i) => (
                    <div key={i} className="fk-promo-card" style={{ background: p.bg }}>
                        <h4>{p.title}</h4>
                        <p>{p.sub}</p>
                    </div>
                ))}
            </div>

            {/* Best of Electronics */}
            <div className="fk-section">
                <div className="fk-section-head">
                    <div>
                        <h2>Best of Electronics</h2>
                        <p className="fk-section-sub">Top picks from leading brands</p>
                    </div>
                    <Link href="/register" className="btn btn-primary btn-sm">
                        View All
                    </Link>
                </div>
                <div className="fk-hscroll">
                    {ELECTRONICS.map((p) => (
                        <div key={p.name} className="fk-product-card">
                            <span className="fk-product-emoji">{p.emoji}</span>
                            <h4>{p.name}</h4>
                            <div className="fk-product-price">
                                <span className="fk-price">{p.price}</span>
                                <span className="fk-old-price">{p.oldPrice}</span>
                            </div>
                            <span className="fk-discount">{p.discount}</span>
                            <div className="fk-rating-row">
                                <span className="fk-rating-badge">★ {p.rating}</span>
                                <span className="fk-review-count">({p.reviews})</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full-Width Banner */}
            <div
                className="fk-wide-banner"
                style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)",
                }}
            >
                <div className="fk-wide-inner">
                    <div>
                        <h3>🔐 Shop with Confidence</h3>
                        <p>
                            ShopMart uses <strong>Visual Password SaaS</strong> for
                            phishing-resistant login. Your account is always secure — the shop never
                            touches the visual challenge.
                        </p>
                    </div>
                    <Link href="/register" className="btn btn-accent">
                        Create Account →
                    </Link>
                </div>
            </div>

            {/* Fashion Top Deals */}
            <div className="fk-section">
                <div className="fk-section-head">
                    <div>
                        <h2>Fashion Top Deals</h2>
                        <p className="fk-section-sub">Trending styles at best prices</p>
                    </div>
                    <Link href="/register" className="btn btn-primary btn-sm">
                        View All
                    </Link>
                </div>
                <div className="fk-hscroll">
                    {FASHION.map((p) => (
                        <div key={p.name} className="fk-product-card">
                            <span className="fk-product-emoji">{p.emoji}</span>
                            <h4>{p.name}</h4>
                            <div className="fk-product-price">
                                <span className="fk-price">{p.price}</span>
                                <span className="fk-old-price">{p.oldPrice}</span>
                            </div>
                            <span className="fk-discount">{p.discount}</span>
                            <div className="fk-rating-row">
                                <span className="fk-rating-badge">★ {p.rating}</span>
                                <span className="fk-review-count">({p.reviews})</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Home & Kitchen */}
            <div className="fk-section">
                <div className="fk-section-head">
                    <div>
                        <h2>Home &amp; Kitchen Essentials</h2>
                        <p className="fk-section-sub">Upgrade your living space</p>
                    </div>
                    <Link href="/register" className="btn btn-primary btn-sm">
                        View All
                    </Link>
                </div>
                <div className="fk-hscroll">
                    {HOME_KITCHEN.map((p) => (
                        <div key={p.name} className="fk-product-card">
                            <span className="fk-product-emoji">{p.emoji}</span>
                            <h4>{p.name}</h4>
                            <div className="fk-product-price">
                                <span className="fk-price">{p.price}</span>
                                <span className="fk-old-price">{p.oldPrice}</span>
                            </div>
                            <span className="fk-discount">{p.discount}</span>
                            <div className="fk-rating-row">
                                <span className="fk-rating-badge">★ {p.rating}</span>
                                <span className="fk-review-count">({p.reviews})</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Integration Info (How it works) */}
            <div className="fk-section">
                <div className="fk-section-head">
                    <div>
                        <h2>How Visual Password Works</h2>
                        <p className="fk-section-sub">Secure authentication in 3 simple steps</p>
                    </div>
                    <span className="fk-section-badge">Integration Flow</span>
                </div>
                <div className="fk-steps">
                    <div className="fk-step">
                        <div className="fk-step-num">1</div>
                        <div>
                            <h4>Create a shopper account</h4>
                            <p>
                                ShopMart registers the user locally. Visual profile setup is
                                initiated via the SaaS enrollment redirect.
                            </p>
                        </div>
                    </div>
                    <div className="fk-step">
                        <div className="fk-step-num">2</div>
                        <div>
                            <h4>Login triggers visual auth</h4>
                            <p>
                                On correct email/password, ShopMart calls <code>/v1/init-auth</code>{" "}
                                and redirects to the hosted verify UI.
                            </p>
                        </div>
                    </div>
                    <div className="fk-step">
                        <div className="fk-step-num">3</div>
                        <div>
                            <h4>Callback validated</h4>
                            <p>
                                ShopMart calls <code>/v1/consume-result</code> to validate the
                                signed callback server-side before setting its session.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="fk-bottom-cta">
                <h3>Ready to experience secure shopping?</h3>
                <p>Create an account and see Visual Password in action</p>
                <div className="cta-row" style={{ justifyContent: "center" }}>
                    <Link className="btn btn-accent" href="/register">
                        Create Account
                    </Link>
                    <Link className="btn btn-muted" href="/login">
                        Sign In
                    </Link>
                </div>
            </div>
        </section>
    );
}
