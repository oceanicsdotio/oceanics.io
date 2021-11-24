const ctx = self;

async function start() {
  ctx.postMessage({
    type: 'tsData',
    data: "Some message",
  });
}

ctx.addEventListener('message', (evt) => {
  switch (evt.data.type) {
    case 'start':
      start();
      return;
  }
});
