const cursorSmall = document.getElementById("cursorsmall");


const positionElement = (e)=> {
  const mouseY = e.clientY;
  const mouseX = e.clientX;
  cursorSmall.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
 
}

window.addEventListener('mousemove', positionElement)

