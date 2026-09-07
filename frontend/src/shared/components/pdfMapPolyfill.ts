type MapWithInsert = Map<unknown, unknown> & {
  getOrInsert?: (key: unknown, value: unknown) => unknown;
  getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
};

const mapProto = Map.prototype as MapWithInsert;

if (typeof mapProto.getOrInsert !== "function") {
  mapProto.getOrInsert = function (key, value) {
    if (this.has(key)) {
      return this.get(key);
    }
    this.set(key, value);
    return value;
  };
}

if (typeof mapProto.getOrInsertComputed !== "function") {
  mapProto.getOrInsertComputed = function (key, callback) {
    if (this.has(key)) {
      return this.get(key);
    }
    const value = callback(key);
    this.set(key, value);
    return value;
  };
}
