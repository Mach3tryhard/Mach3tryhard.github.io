const cursorPointed = document.getElementById("cursor");

const moveCursor = (e)=> {
  const mouseY = e.clientY;
  const mouseX = e.clientX;
  //console.log(mouseX);
  //console.log(mouseY);
  cursorPointed.style.transform = `translate3d(${mouseX-22}px, ${mouseY-22}px, 0) rotate(45deg)`;
  cursorPointed.style.backgroundPosition = mouseX%1000+500+"px "+mouseY%1000+"px";

}

window.addEventListener('mousemove', moveCursor)

function hide()
{
  cursorPointed.style.visibility = "hidden";
}
function unhide()
{
  cursorPointed.style.visibility = "visible";
}