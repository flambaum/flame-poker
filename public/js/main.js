document.addEventListener("DOMContentLoaded", () => {
    const logout = document.getElementById(`logout`);
    if (logout) {
        logout.addEventListener(`click`, () => {
            fetch(`/logout`, {method: `post`})
                .then((res) => {
                    if (res.ok) location.assign(`/`);
                });
        });
    };
});