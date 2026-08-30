/** WebContainer stub — satisfies static imports; Iroh sync is unavailable in-browser. */

const unavailable = () => {
  throw new Error('Iroh sync is not available in the WebContainer sandbox');
};

export class Endpoint {
  static builder() {
    return new EndpointBuilder();
  }
  static async bind() {
    unavailable();
  }
}

export class EndpointBuilder {
  secretKey() {
    return this;
  }
  alpns() {
    return this;
  }
  async bind() {
    unavailable();
  }
}

export class EndpointTicket {}
export class EndpointAddr {}
export function presetMinimal() {}
