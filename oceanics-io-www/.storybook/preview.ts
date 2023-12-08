export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  layout: 'fullscreen',
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

if (typeof global.process === 'undefined') {
  const { worker } = require('../src/mocks/browser')
  worker.start()
}