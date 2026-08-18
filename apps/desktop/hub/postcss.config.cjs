module.exports = {
  plugins: {
    tailwindcss: {
      config: require('node:path').resolve(__dirname, './tailwind.config.ts'),
    },
    autoprefixer: {},
  },
};
