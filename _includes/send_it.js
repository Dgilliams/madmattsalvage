<script type="text/javascript">
function unhideElement(elementName){
  var element = document.getElementById(elementName);
  console.log(elementName);

  if(element.style.display === "none") {
    scrollBy(0, 75);
    element.style.display = "block";
  } else {
    element.style.display = "none";
  }
}

</script>

<script type="text/javascript">
function toArray(arrayLike){
  var length = arrayLike.length;
  var array = [];

  if(length === null || length === undefined || length === 0){
    return;
  }

  for(var i = 0; i < length; ++i){
    array[i] = arrayLike[i];
  }
  return array;

}

function resizeTextArea(textarea){
  console.log(textarea);
  textarea.style.height = "auto";
  var scrollHeight = textarea.scrollHeight;
  var hasScrollbar = scrollHeight !== 200;
  textarea.style.height = textarea.scrollHeight + hasScrollbar*12 + "px";
  console.log(textarea.style.scrollHeight);
}

toArray(document.getElementsByTagName("textarea")).forEach(function(textarea){
  textarea.oninput = function(){
    resizeTextArea(textarea);
  };
});
</script>

<script language="JavaScript">
// Code for validating the form
// Visit https://www.javascript-coder.com/html-form/javascript-form-validation.phtml
// for details
var frmvalidator  = new Validator("send_it_inquiry_form");
frmvalidator.addValidation("name","req","Please provide your name");
frmvalidator.addValidation("contact","req","Please provide an Email address or Phone Number");
</script>
