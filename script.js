/* =========================================================
   HOSPEX — MVP frontend logic (no backend)
   Everything persists in localStorage so the demo survives
   refreshes but needs no server.
   ========================================================= */

(function () {
    "use strict";

    /* ---------------------------------------------------
       STORAGE KEYS
    --------------------------------------------------- */
    const KEYS = {
        RESOURCES: "hospex_resources",
        USERS: "hospex_users",
        SESSION: "hospex_session",
        REQUESTS: "hospex_requests"
    };

    /* ---------------------------------------------------
       LOOKUPS
    --------------------------------------------------- */
    const CATEGORY_ICON = {
        food: "🍱",
        furniture: "🪑",
        equipment: "🍳",
        linen: "🛏️",
        supplies: "🧹",
        packaging: "📦"
    };

    const CATEGORY_LABEL = {
        food: "Food",
        furniture: "Furniture",
        equipment: "Equipment",
        linen: "Linen",
        supplies: "Supplies",
        packaging: "Packaging"
    };

    const EXCHANGE_LABEL = {
        exchange: "♻️ Exchange",
        sell: "💰 Sell",
        donate: "🎁 Donate"
    };

    /* ---------------------------------------------------
       SEED DATA (first run only)
    --------------------------------------------------- */
    const SEED_RESOURCES = [
        {
            id: "r1",
            name: "Banquet Chairs",
            category: "furniture",
            quantity: 50,
            condition: "good",
            exchangeType: "exchange",
            description: "50 chairs available in good condition.",
            ownerName: "Hotel Sunshine",
            ownerInitials: "HS",
            distance: 2.1,
            verified: true
        },
        {
            id: "r2",
            name: "Commercial Mixer",
            category: "equipment",
            quantity: 1,
            condition: "used",
            exchangeType: "sell",
            description: "Heavy-duty kitchen mixer, lightly used.",
            ownerName: "Grand Café",
            ownerInitials: "GC",
            distance: 3.4,
            verified: true
        },
        {
            id: "r3",
            name: "Premium Bedsheets",
            category: "linen",
            quantity: 100,
            condition: "new",
            exchangeType: "donate",
            description: "Clean, unused hotel bedsheets available.",
            ownerName: "Royal Palace",
            ownerInitials: "RP",
            distance: 1.7,
            verified: true
        },
        {
            id: "r4",
            name: "Surplus Meal Packs",
            category: "food",
            quantity: 30,
            condition: "new",
            exchangeType: "donate",
            description: "Fresh surplus meals available for donation.",
            ownerName: "Bistro Terrace",
            ownerInitials: "BT",
            distance: 4.2,
            verified: true
        }
    ];

    /* ---------------------------------------------------
       STORAGE HELPERS
    --------------------------------------------------- */
    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            /* storage unavailable — demo still works in-memory for this session */
        }
    }

    let resources = load(KEYS.RESOURCES, null);
    if (!resources) {
        resources = SEED_RESOURCES;
        save(KEYS.RESOURCES, resources);
    }

    let users = load(KEYS.USERS, []);
    let session = load(KEYS.SESSION, null);
    let requests = load(KEYS.REQUESTS, []);

    /* ---------------------------------------------------
       DOM READY
    --------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", init);

    function init() {
        renderResources();
        updateAuthUI();
        updateStats();
        wireNav();
        wireModals();
        wireFilters();
        wireForms();
        wireResourceGridClicks();
    }

    /* ---------------------------------------------------
       TOAST
    --------------------------------------------------- */
    let toastTimer = null;
    function showToast(message, type) {
        const toast = document.getElementById("toast");
        const icon = document.getElementById("toastIcon");
        const msg = document.getElementById("toastMessage");
        if (!toast) return;

        msg.textContent = message;
        icon.textContent = type === "error" ? "⚠" : "✓";
        toast.classList.toggle("error", type === "error");
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3200);
    }

    /* ---------------------------------------------------
       MODALS
    --------------------------------------------------- */
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add("open");
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove("open");
    }

    function wireModals() {
        document.querySelectorAll(".modal-close").forEach((btn) => {
            btn.addEventListener("click", () => closeModal(btn.dataset.close));
        });

        document.querySelectorAll(".modal").forEach((modal) => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) modal.classList.remove("open");
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                document.querySelectorAll(".modal.open").forEach((m) => m.classList.remove("open"));
            }
        });

        document.querySelectorAll("[data-switch-to]").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                closeModal(link.dataset.switchFrom);
                openModal(link.dataset.switchTo);
            });
        });
    }

    /* ---------------------------------------------------
       NAV / HERO / CTA WIRING
    --------------------------------------------------- */
    function wireNav() {
        document.getElementById("loginBtn").addEventListener("click", () => {
            if (session) {
                logout();
            } else {
                openModal("loginModal");
            }
        });

        document.getElementById("getStartedBtn").addEventListener("click", () => openModal("registerModal"));
        document.getElementById("heroGetStarted").addEventListener("click", () => openModal("registerModal"));
        document.getElementById("ctaButton").addEventListener("click", () => openModal("registerModal"));

        document.getElementById("exploreBtn").addEventListener("click", () => {
            document.getElementById("marketplace").scrollIntoView({ behavior: "smooth" });
        });

        document.getElementById("heroRequestBtn").addEventListener("click", () => {
            openRequestModal("Banquet Chairs", "r1");
        });

        document.getElementById("listResourceBtn").addEventListener("click", () => {
            if (!session) {
                showToast("Login or register your business first", "error");
                openModal("registerModal");
                return;
            }
            openModal("resourceModal");
        });
    }

    /* ---------------------------------------------------
       AUTH
    --------------------------------------------------- */
    function updateAuthUI() {
        const loginBtn = document.getElementById("loginBtn");
        if (session) {
            loginBtn.textContent = "Logout (" + session.businessName + ")";
        } else {
            loginBtn.textContent = "Login";
        }
    }

    function logout() {
        session = null;
        save(KEYS.SESSION, null);
        updateAuthUI();
        showToast("Logged out");
    }

    function initials(name) {
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("");
    }

    /* ---------------------------------------------------
       FORMS
    --------------------------------------------------- */
    function wireForms() {
        document.getElementById("loginForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;

            const user = users.find((u) => u.email === email);
            if (!user) {
                showToast("No account found for that email — register instead", "error");
                return;
            }
            if (user.password !== password) {
                showToast("Incorrect password", "error");
                return;
            }

            session = { businessName: user.businessName, email: user.email };
            save(KEYS.SESSION, session);
            updateAuthUI();
            e.target.reset();
            closeModal("loginModal");
            showToast("Welcome back, " + user.businessName);
        });

        document.getElementById("registerForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const businessName = document.getElementById("businessName").value.trim();
            const businessType = document.getElementById("businessType").value;
            const email = document.getElementById("registerEmail").value.trim().toLowerCase();
            const password = document.getElementById("registerPassword").value;

            if (users.some((u) => u.email === email)) {
                showToast("An account with that email already exists — login instead", "error");
                return;
            }

            const newUser = { businessName, businessType, email, password };
            users.push(newUser);
            save(KEYS.USERS, users);

            session = { businessName, email };
            save(KEYS.SESSION, session);
            updateAuthUI();

            e.target.reset();
            closeModal("registerModal");
            showToast("Account created — welcome to HOSPEX, " + businessName);
        });

        document.getElementById("resourceForm").addEventListener("submit", (e) => {
            e.preventDefault();
            if (!session) {
                showToast("Please login first", "error");
                return;
            }

            const name = document.getElementById("resourceName").value.trim();
            const category = document.getElementById("resourceCategory").value;
            const quantity = parseInt(document.getElementById("resourceQuantity").value, 10) || 1;
            const condition = document.getElementById("resourceCondition").value;
            const exchangeType = document.getElementById("exchangeType").value;

            const conditionLabel = { new: "New", good: "good", used: "used" }[condition] || condition;

            const resource = {
                id: "r" + Date.now(),
                name,
                category,
                quantity,
                condition,
                exchangeType,
                description: quantity + " " + (quantity === 1 ? "unit" : "units") + " available, " + conditionLabel + " condition.",
                ownerName: session.businessName,
                ownerInitials: initials(session.businessName),
                distance: Math.round((0.5 + Math.random() * 9) * 10) / 10,
                verified: true
            };

            resources.unshift(resource);
            save(KEYS.RESOURCES, resources);

            e.target.reset();
            closeModal("resourceModal");
            showToast(name + " listed on the marketplace");
            renderResources();
            updateStats();
        });

        document.getElementById("requestForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const quantity = document.getElementById("requestQuantity").value;
            const message = document.getElementById("requestMessage").value.trim();
            const resourceId = e.target.dataset.resourceId || null;
            const resourceName = document.getElementById("requestResourceName").textContent;

            requests.push({
                id: "req" + Date.now(),
                resourceId,
                resourceName,
                quantity,
                message,
                requestedBy: session ? session.businessName : "Guest",
                createdAt: new Date().toISOString()
            });
            save(KEYS.REQUESTS, requests);

            e.target.reset();
            closeModal("requestModal");
            showToast("Request sent for " + resourceName);
        });
    }

    /* ---------------------------------------------------
       REQUEST MODAL
    --------------------------------------------------- */
    function openRequestModal(resourceName, resourceId) {
        document.getElementById("requestResourceName").textContent = resourceName;
        document.getElementById("requestForm").dataset.resourceId = resourceId || "";
        openModal("requestModal");
    }

    /* ---------------------------------------------------
       RESOURCE GRID
    --------------------------------------------------- */
    function resourceCardHTML(r) {
        const bg = r.category + "-bg";
        const icon = CATEGORY_ICON[r.category] || "📦";
        const catLabel = CATEGORY_LABEL[r.category] || r.category;
        const typeLabel = EXCHANGE_LABEL[r.exchangeType] || r.exchangeType;

        return (
            '<article class="resource-card" data-category="' + r.category + '" data-distance="' + r.distance + '">' +
                '<div class="resource-image ' + bg + '">' + icon + "</div>" +
                '<div class="resource-card-body">' +
                    '<div class="resource-top">' +
                        '<span class="category-badge">' + catLabel + "</span>" +
                        '<span class="distance">📍 ' + r.distance + " km</span>" +
                    "</div>" +
                    "<h3>" + escapeHTML(r.name) + "</h3>" +
                    "<p>" + escapeHTML(r.description) + "</p>" +
                    '<div class="resource-details">' +
                        "<span>📦 " + r.quantity + (r.quantity === 1 ? " Unit" : " Units") + "</span>" +
                        "<span>" + typeLabel + "</span>" +
                    "</div>" +
                    '<div class="resource-footer">' +
                        '<div class="owner">' +
                            '<div class="owner-avatar">' + escapeHTML(r.ownerInitials) + "</div>" +
                            "<div><strong>" + escapeHTML(r.ownerName) + "</strong>" +
                            "<span>" + (r.verified ? "✓ Verified" : "") + "</span></div>" +
                        "</div>" +
                        '<button class="small-btn request-btn" data-id="' + r.id + '" data-resource="' + escapeHTML(r.name) + '">Request</button>' +
                    "</div>" +
                "</div>" +
            "</article>"
        );
    }

    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = String(str == null ? "" : str);
        return div.innerHTML;
    }

    function getFilteredResources() {
        const search = document.getElementById("searchInput").value.trim().toLowerCase();
        const category = document.getElementById("categoryFilter").value;
        const distance = document.getElementById("distanceFilter").value;

        return resources.filter((r) => {
            const matchesSearch = !search || r.name.toLowerCase().includes(search) || r.ownerName.toLowerCase().includes(search);
            const matchesCategory = category === "all" || r.category === category;
            const matchesDistance = distance === "all" || r.distance <= parseFloat(distance);
            return matchesSearch && matchesCategory && matchesDistance;
        });
    }

    function renderResources() {
        const grid = document.getElementById("resourceGrid");
        const list = getFilteredResources();

        if (list.length === 0) {
            grid.innerHTML = '<div class="resource-grid-empty">No resources match your search. Try a different category or distance.</div>';
            return;
        }

        grid.innerHTML = list.map(resourceCardHTML).join("");
    }

    function wireFilters() {
        document.getElementById("searchInput").addEventListener("input", renderResources);
        document.getElementById("categoryFilter").addEventListener("change", renderResources);
        document.getElementById("distanceFilter").addEventListener("change", renderResources);
    }

    function wireResourceGridClicks() {
        document.getElementById("resourceGrid").addEventListener("click", (e) => {
            const btn = e.target.closest(".request-btn");
            if (!btn) return;
            openRequestModal(btn.dataset.resource, btn.dataset.id);
        });
    }

    /* ---------------------------------------------------
       STATS (hero + impact)
    --------------------------------------------------- */
    function updateStats() {
        const totalResources = resources.length;
        const businesses = new Set(resources.map((r) => r.ownerName)).size;

        // simple demo assumptions to turn listings into headline numbers
        const avgValuePerResource = 350; // ₹ per resource, illustrative
        const moneySaved = totalResources * avgValuePerResource;
        const wasteAvoidedKg = totalResources * 4.2;
        const co2Kg = totalResources * 3.5;

        setText("heroResources", (100 + totalResources) + "+");
        setText("heroBusinesses", (40 + businesses) + "+");
        setText("heroSaved", "₹" + Math.round((moneySaved + 38000) / 1000) + "K+");

        setText("impactResources", String(totalResources + 350));
        setText("impactMoney", "₹" + (moneySaved + 38000).toLocaleString("en-IN"));
        setText("impactWaste", Math.round(wasteAvoidedKg + 195) + " kg");
        setText("impactCarbon", Math.round(co2Kg + 160) + " kg");
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
})();
