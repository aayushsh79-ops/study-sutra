document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    const toggleBtn = document.getElementById("dark-mode-toggle");
    const contactForm = document.getElementById("contact-form");
    const searchInput = document.getElementById("searchbar");

    // MENU TOGGLE (mobile)
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            const isActive = navLinks.classList.toggle("active");
            menuToggle.setAttribute("aria-expanded", isActive ? "true" : "false");
        });
    }

    // DARK MODE TOGGLE
    if (toggleBtn) {
        const enableDark = () => {
            document.body.classList.add("dark");
            localStorage.setItem("theme", "dark");
            toggleBtn.innerText = "☀️";
            toggleBtn.setAttribute("aria-pressed", "true");
        };

        const disableDark = () => {
            document.body.classList.remove("dark");
            localStorage.setItem("theme", "light");
            toggleBtn.innerText = "🌙";
            toggleBtn.setAttribute("aria-pressed", "false");
        };

        toggleBtn.addEventListener("click", () => {
            if (document.body.classList.contains("dark")) {
                disableDark();
            } else {
                enableDark();
            }
        });

        // On load
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "dark") {
            enableDark();
        } else {
            disableDark();
        }
    }

    // Contact form handler (if exists)
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            alert("Thanks for reaching out! We'll get back to you soon.");
            contactForm.reset();
        });
    }

    // SEARCH FILTER FUNCTIONALITY
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const query = this.value.trim().toLowerCase();
            const cards = document.querySelectorAll(".card");

            cards.forEach((card) => {
                const title = (card.dataset.title || "").toLowerCase();
                const content = card.innerText.toLowerCase();

                if (!query || title.includes(query) || content.includes(query)) {
                    card.style.display = "block";
                } else {
                    card.style.display = "none";
                }
            });
        });
    }
});

