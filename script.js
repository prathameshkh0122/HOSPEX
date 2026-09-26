/* HOSPEX frontend connected to the Express REST API. */
(function () {
    "use strict";

    const API = "/api/v1";
    const TOKEN_KEY = "hospex_token";
    const CATEGORY_ICON = { food: "🍱", furniture: "🪑", equipment: "🍳", linen: "🛏️", supplies: "🧹", packaging: "📦" };
    const CATEGORY_LABEL = { food: "Food", furniture: "Furniture", equipment: "Equipment", linen: "Linen", supplies: "Supplies", packaging: "Packaging" };
    const EXCHANGE_LABEL = { exchange: "♻️ Exchange", sell: "💰 Sell", donate: "🎁 Donate" };
    let token = localStorage.getItem(TOKEN_KEY);
    let session = null;
    let resources = [];
    let toastTimer = null;
    let searchTimer = null;

    document.addEventListener("DOMContentLoaded", init);

    async function api(path, options) {
        const config = options || {};
        const headers = Object.assign({ "Content-Type": "application/json" }, config.headers || {});
        if (token) headers.Authorization = "Bearer " + token;
        let response;
        try {
            response = await fetch(API + path, Object.assign({}, config, { headers }));
        } catch (_error) {
            throw new Error("Could not reach HOSPEX server. Start the backend and open http://localhost:5000.");
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401 && token) clearSession();
            throw new Error(result.message || "Request failed. Please try again.");
        }
        return result;
    }

    async function init() {
        wireNav();
        wireModals();
        wireFilters();
        wireForms();
        wireResourceGridClicks();
        updateAuthUI();
        await Promise.all([loadResources(), loadStats(), restoreSession()]);
    }

    function showToast(message, type) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        document.getElementById("toastMessage").textContent = message;
        document.getElementById("toastIcon").textContent = type === "error" ? "⚠" : "✓";
        toast.classList.toggle("error", type === "error");
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add("open");
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove("open");
    }

    function wireModals() {
        document.querySelectorAll(".modal-close").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
        document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => {
            if (event.target === modal) modal.classList.remove("open");
        }));
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") document.querySelectorAll(".modal.open").forEach((modal) => modal.classList.remove("open"));
        });
        document.querySelectorAll("[data-switch-to]").forEach((link) => link.addEventListener("click", (event) => {
            event.preventDefault();
            closeModal(link.dataset.switchFrom);
            openModal(link.dataset.switchTo);
        }));
    }

    function wireNav() {
        document.getElementById("loginBtn").addEventListener("click", () => session ? logout() : openModal("loginModal"));
        ["getStartedBtn", "heroGetStarted", "ctaButton"].forEach((id) => document.getElementById(id).addEventListener("click", () => openModal("registerModal")));
        document.getElementById("exploreBtn").addEventListener("click", () => document.getElementById("marketplace").scrollIntoView({ behavior: "smooth" }));
        document.getElementById("heroRequestBtn").addEventListener("click", () => {
            const featured = resources.find((resource) => resource.name === "Banquet Chairs");
            if (featured) openRequestModal(featured);
            else document.getElementById("marketplace").scrollIntoView({ behavior: "smooth" });
        });
        document.getElementById("listResourceBtn").addEventListener("click", () => {
            if (!session) {
                showToast("Login or register your business first", "error");
                openModal("loginModal");
                return;
            }
            openModal("resourceModal");
        });
    }

    async function restoreSession() {
        if (!token) return;
        try {
            const result = await api("/auth/me");
            session = result.data.user;
            updateAuthUI();
        } catch (_error) {
            clearSession();
            updateAuthUI();
        }
    }

    function updateAuthUI() {
        const button = document.getElementById("loginBtn");
        if (button) button.textContent = session ? "Logout" : "Login";

        const welcome = document.getElementById("welcomeUser");
        if (welcome) {
            if (session) {
                welcome.textContent = "Hello, " + session.businessName;
                welcome.style.display = "inline";
            } else {
                welcome.textContent = "";
                welcome.style.display = "none";
            }
        }
    }

    function clearSession() {
        token = null;
        session = null;
        localStorage.removeItem(TOKEN_KEY);
    }

    function logout() {
        clearSession();
        updateAuthUI();
        showToast("Logged out");
    }

    function initials(name) {
        return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
    }

    function setBusy(form, busy) {
        const button = form.querySelector('[type="submit"]');
        if (button) button.disabled = busy;
    }

    function handleSubmit(form, handler) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            setBusy(form, true);
            try { await handler(event); }
            catch (error) { showToast(error.message, "error"); }
            finally { setBusy(form, false); }
        });
    }

    function wireForms() {
        handleSubmit(document.getElementById("loginForm"), async (event) => {
            const result = await api("/auth/login", { method: "POST", body: JSON.stringify({
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value
            }) });
            saveSession(result.data);
            event.target.reset();
            closeModal("loginModal");
            showToast("Welcome back, " + session.businessName);
        });

        handleSubmit(document.getElementById("registerForm"), async (event) => {
            const result = await api("/auth/register", { method: "POST", body: JSON.stringify({
                businessName: document.getElementById("businessName").value.trim(),
                businessType: document.getElementById("businessType").value,
                email: document.getElementById("registerEmail").value.trim(),
                password: document.getElementById("registerPassword").value
            }) });
            saveSession(result.data);
            event.target.reset();
            closeModal("registerModal");
            showToast("Account created — welcome to HOSPEX, " + session.businessName);
            loadStats();
        });

        handleSubmit(document.getElementById("resourceForm"), async (event) => {
            if (!session) throw new Error("Please log in first.");
            const name = document.getElementById("resourceName").value.trim();
            const category = document.getElementById("resourceCategory").value;
            const quantity = Number(document.getElementById("resourceQuantity").value);
            const condition = document.getElementById("resourceCondition").value;
            await api("/resources", { method: "POST", body: JSON.stringify({
                name, category, quantity, condition,
                exchangeType: document.getElementById("exchangeType").value,
                description: quantity + (quantity === 1 ? " unit" : " units") + " available, " + condition + " condition."
            }) });
            event.target.reset();
            closeModal("resourceModal");
            showToast(name + " listed on the marketplace");
            await Promise.all([loadResources(), loadStats()]);
        });

        handleSubmit(document.getElementById("requestForm"), async (event) => {
            if (!session) throw new Error("Please log in to request a resource.");
            const resourceId = event.target.dataset.resourceId;
            const resource = resources.find((item) => item._id === resourceId);
            const result = await api("/requests", { method: "POST", body: JSON.stringify({
                resourceId,
                quantity: Number(document.getElementById("requestQuantity").value),
                message: document.getElementById("requestMessage").value.trim()
            }) });
            event.target.reset();
            closeModal("requestModal");
            showToast(result.message || "Request sent" + (resource ? " for " + resource.name : ""));
        });
    }

    function saveSession(data) {
        token = data.token;
        session = data.user;
        localStorage.setItem(TOKEN_KEY, token);
        updateAuthUI();
    }

    function openRequestModal(resource) {
        if (!session) {
            showToast("Login or register to request a resource", "error");
            openModal("loginModal");
            return;
        }
        if (resource.owner && resource.owner === session._id) {
            showToast("You cannot request your own resource", "error");
            return;
        }
        document.getElementById("requestResourceName").textContent = resource.name;
        const form = document.getElementById("requestForm");
        form.dataset.resourceId = resource._id;
        const quantity = document.getElementById("requestQuantity");
        quantity.max = resource.quantity;
        quantity.value = Math.min(1, resource.quantity);
        openModal("requestModal");
    }

    async function loadResources() {
        const params = new URLSearchParams();
        const search = document.getElementById("searchInput").value.trim();
        const category = document.getElementById("categoryFilter").value;
        const distance = document.getElementById("distanceFilter").value;
        if (search) params.set("search", search);
        if (category !== "all") params.set("category", category);
        if (distance !== "all") params.set("distance", distance);
        try {
            const result = await api("/resources?" + params.toString());
            resources = result.data.resources;
            renderResources();
        } catch (error) {
            document.getElementById("resourceGrid").innerHTML = '<div class="resource-grid-empty">' + escapeHTML(error.message) + '</div>';
        }
    }

    function resourceCardHTML(resource) {
        const category = CATEGORY_LABEL[resource.category] || resource.category;
        const distance = resource.distance == null ? null : Number(resource.distance);
        return '<article class="resource-card" data-category="' + escapeHTML(resource.category) + '" data-distance="' + distance + '">' +
            '<div class="resource-image ' + escapeHTML(resource.category) + '-bg">' + (CATEGORY_ICON[resource.category] || "📦") + '</div>' +
            '<div class="resource-card-body"><div class="resource-top"><span class="category-badge">' + escapeHTML(category) + '</span><span class="distance">' + (distance == null ? "Distance unavailable" : "📍 " + distance + " km") + '</span></div>' +
            '<h3>' + escapeHTML(resource.name) + '</h3><p>' + escapeHTML(resource.description || "") + '</p>' +
            '<div class="resource-details"><span>📦 ' + Number(resource.quantity) + (Number(resource.quantity) === 1 ? " Unit" : " Units") + '</span><span>' + escapeHTML(EXCHANGE_LABEL[resource.exchangeType] || resource.exchangeType) + '</span></div>' +
            '<div class="resource-footer"><div class="owner"><div class="owner-avatar">' + escapeHTML(initials(resource.ownerName)) + '</div><div><strong>' + escapeHTML(resource.ownerName) + '</strong><span>' + (resource.verified ? "✓ Verified" : "") + '</span></div></div>' +
            '<button class="small-btn request-btn" data-id="' + escapeHTML(resource._id) + '">Request</button></div></div></article>';
    }

    function escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = String(value == null ? "" : value);
        return div.innerHTML;
    }

    function renderResources() {
        const grid = document.getElementById("resourceGrid");
        if (!resources.length) {
            grid.innerHTML = '<div class="resource-grid-empty">No resources match your search. Try a different category or distance.</div>';
            return;
        }
        grid.innerHTML = resources.map(resourceCardHTML).join("");
    }

    function wireFilters() {
        document.getElementById("searchInput").addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadResources, 250);
        });
        ["categoryFilter", "distanceFilter"].forEach((id) => document.getElementById(id).addEventListener("change", loadResources));
    }

    function wireResourceGridClicks() {
        document.getElementById("resourceGrid").addEventListener("click", (event) => {
            const button = event.target.closest(".request-btn");
            if (button) {
                const resource = resources.find((item) => item._id === button.dataset.id);
                if (resource) openRequestModal(resource);
            }
        });
    }

    async function loadStats() {
        try {
            const result = await api("/stats");
            const stats = result.data;
            const saved = stats.completedRequests * 350;
            document.getElementById("heroResources").textContent = stats.resources + "+";
            document.getElementById("heroBusinesses").textContent = stats.businesses + "+";
            document.getElementById("heroSaved").textContent = "₹" + Math.round(saved / 1000) + "K+";
            document.getElementById("impactResources").textContent = String(stats.completedRequests);
            document.getElementById("impactMoney").textContent = "₹" + saved.toLocaleString("en-IN");
            document.getElementById("impactWaste").textContent = Math.round(stats.completedRequests * 4.2) + " kg";
            document.getElementById("impactCarbon").textContent = Math.round(stats.completedRequests * 3.5) + " kg";
        } catch (_error) { /* Marketplace and auth still work if stats are temporarily unavailable. */ }
    }
})();
