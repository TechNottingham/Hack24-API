export class Random {
  /**
   * Generates a random number between min and max.
   * @param min The minimum number to generate.
   * @param max The maximum number to generate.
   * @returns The random number.
   */
  public static num (min?: number, max?: number): number {
    const _min = min || 0;
    const _max = max || Number.MAX_VALUE - 1;
    return Math.random() * (_max - _min + 1) + _min;
  }

  /**
   * Generates a random integer between min and max.
   * @param min The minimum integer to generate.
   * @param max The maximum integer to generate.
   * @returns The random integer.
   */
  public static int (min?: number, max?: number): number {
    const _min = min || 0;
    const _max = max || 4294967296;
    return Math.floor(this.num(_min, _max));
  }

  /**
   * Generates a random single-character string between min and max.
   * @param min The minimum character to use when generating. Default 'a'.
   * @param max The maximum character to use when generating. Default 'z'.
   * @returns The random single-character string.
   */
  public static char (min?: string, max?: string): string {
    const _min = min || 'a';
    const _max = max || 'z';
    const n = this.int(_min.charCodeAt(0), _max.charCodeAt(0));
    return String.fromCharCode(n);
  }

  /**
   * Generates a random string with length between min and max.
   * @param length The length of the string to generate. Default 50.
   * @param min The minimum character to use when generating. Default 'a'.
   * @param max The maximum character to use when generating. Default 'z'.
   * @returns The random string.
   */
  public static str (length?: number, min?: string, max?: string) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += this.char(min, max);
    }
    return result;
  }
}
