/* eslint-disable */
function confirmSubmit(event, message) {
  event.preventDefault();
  if (confirm(message)) {
    event.target.parentElement.submit();
  }
}
