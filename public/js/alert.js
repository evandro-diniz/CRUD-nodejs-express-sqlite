document.addEventListener("DOMContentLoaded", () => {
  const alert = document.querySelector(".alert");
  if (alert) {
    setTimeout(() => {
      alert.style.display = "none";
    }, 5000); // Oculta o alerta após 5 segundos
  }
});
