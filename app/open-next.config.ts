export default {
  default: {
    override: {
      wrapper: 'cloudflare-node',
    },
  },
  middleware: {
    override: {
      wrapper: 'cloudflare-edge',
    },
  },
};


