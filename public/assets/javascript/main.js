function confirmSubmit(event, message) {
  /* console.log("EVENT", Object.keys(event));
  console.log("TARGET", Object.keys(event.target));
  console.log("PARELE", Object.keys(event.target.parentElement));
  */
  event.preventDefault();
  //  event.stopPropagation();
  if (confirm(message)) {
    event.target.parentElement.submit();
  }
}
