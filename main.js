// on prend le model
var modal = document.getElementById('id01');

// quand on clique en dehors du model on le ferm
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}