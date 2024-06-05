var rez=0;
const test = document.getElementById("opennavbutton");
const test1 = document.getElementById("mySidenav");

function closebar()
{
    console.log(rez);
    rez+=1;
    if(rez==2)
    {
        closeNav()
        rez=0;
    }
}

function openNav() {
    document.getElementById("mySidenav").style.left = "0px";
    document.getElementById("mySidenav").style.width = "267px";
}

function closeNav() {
    rez=0;
    document.getElementById("mySidenav").style.left = "-267px";
    document.getElementById("mySidenav").style.width = "267px";
    //document.getElementById("mySidenav").style.width = "0px";
}
