export default {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
    },
  },
  middleware: {
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
    },
  },
};


