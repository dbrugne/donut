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
   * Return a RegExp object that match subject equals the full string
   * @param string
   * @param flag
   * @returns {RegExp}
   */
  buildExclusive: function(string, flag) {
    flag = flag || 'i';
    string = ''+string;
    return new RegExp('^' + this.escape(string) + '$', flag);
  },

  /**
   * Return a RegExp object that match for string occurence in subject
   * @param string
   * @param flag
   * @returns {RegExp}
   */
  buildContain: function(string, flag) {
    flag = flag || 'i';
    string = ''+string;
    return new RegExp(this.escape(string), flag);
  }

};