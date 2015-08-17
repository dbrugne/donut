jQuery.fn.extend({
  insertAtCaret: function (myValue) {
    return this.each(function (i) {
      if (document.selection) {
        //For browsers like Internet Explorer
        this.focus();
        sel = document.selection.createRange();
        sel.text = myValue;
        this.focus();
      }
      else if (this.selectionStart || this.selectionStart == '0') {
        //For browsers like Firefox and Webkit based
        var startPos = this.selectionStart;
        var endPos = this.selectionEnd;
        var scrollTop = this.scrollTop;
        this.value = this.value.substring(0, startPos) + myValue + this.value.substring(endPos, this.value.length);
        this.focus();
        this.selectionStart = startPos + myValue.length;
        this.selectionEnd = startPos + myValue.length;
        this.scrollTop = scrollTop;
      } else {
        this.value += myValue;
        this.focus();
      }
    })
  },

  getCursorPosition: function () {
    var input = this.get(0);
    if (!input) return; // No (input) element found
    if ('selectionStart' in input) {
      // Standard-compliant browsers
      return input.selectionStart;
    } else if (document.selection) {
      // IE
      input.focus();
      var sel = document.selection.createRange();
      var selLen = document.selection.createRange().text.length;
      sel.moveStart('character', -input.value.length);
      return sel.text.length - selLen;
    }
  }
});