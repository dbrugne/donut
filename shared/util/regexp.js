module.exports = {

  /**
   * Escape string with RegExp reserved chars
   * @param string
   * @returns string
   */
  escape: function(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  },

  /**
   * Return a RegExp object that match the full string
   * @param string
   * @param flag
   * @returns {RegExp}
   */
  buildFromString: function(string, flag) {
    flag = flag || 'i';
    string = ''+string;
    return new RegExp('^' + this.escape(string) + '$', flag);
  }

};