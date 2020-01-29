
//
// Array.from(document.getElementsByClassName("target"))
//   .forEach(function(element) {
//     element.addEventListener('mouseenter', () => {
//       if (!state.target.id || !state.target.active || state.target.id !== element.id) {
//         const rect = element.getBoundingClientRect();
//         state.target = {
//           active: true,
//           x: rect.x + rect.width / 2.0,
//           y: rect.y + rect.height / 2.0,
//           id: element.id
//         };
//         state.delta.x = 0.0;
//         state.delta.y = 0.0;
//         state.reticule.x = state.target.x;
//         state.reticule.y = state.target.y;
//       }
//
//     });
//   });

//
// addEventListener('mousedown', e => {
//   state.dragging = true;
//   state.delta.drag = 0.0;
//   state.zero = performance.now();
// });
//
// addEventListener('mouseup', e => {
//   state.dragging = false;
//   // console.log(performance.now() - state.zero);
//   if (performance.now() - state.zero < 400) {
//     state.depth = (state.depth + 1) % 3;
//     console.log("Depth", state.depth)
//   }
// });
//
// addEventListener('mousemove', e => {
//   let tu = e.clientX;
//   let tv =  e.clientY;
//   if (state.target.active) {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     if (!state.dragging && Math.sqrt(state.delta.x * state.delta.x + state.delta.y * state.delta.y) > 48) {
//       state.target.active = false;
//     }
//   } else {
//     state.delta.drag += (tu - state.cursor.u);
//
//   }
//   state.cursor.u = tu;
//   state.cursor.v = tv;
//
// });


const ring = (ctx, radius) => {
  ctx.beginPath();
  ctx.arc(0,0, radius,0,Math.PI*2,true);
  ctx.stroke();
};

const ticks = (ctx, theta, n, a, b, indicator = 0) => {
  ctx.save();
  ctx.rotate(theta);
  for (let i=0; i<n; i++){
    ctx.beginPath();
    ctx.rotate(2*Math.PI / n);
    ctx.moveTo(a,0);
    ctx.lineTo((i === 0 ? b + indicator : b),0);
    ctx.stroke();
  }
  ctx.restore();
};

const keyring = (ctx, a, b, n) => {
  ctx.save();
  for (let i=0; i<n; i++){
    ctx.rotate(2*Math.PI / n);
    ctx.beginPath();
    ctx.arc(a,0, b,0,Math.PI*2,true);
    ctx.stroke();
  }
  ctx.restore();
};
//
// const cursor = () => {
//   const size = 128;
//   const canvas = document.createElement('canvas');
//   canvas.width = canvas.height = size;
//   const ctx = canvas.getContext('2d');
//   let time = performance.now() | 0.0;
//
//   ctx.clearRect(0,0, size, size);
//   ctx.translate(size / 2,size / 2);
//   ctx.scale(0.4,0.4);
//
//   ctx.lineWidth = 5;
//   ctx.lineCap = "round";
//
//   // Outer ring
//   ctx.strokeStyle = "#FF00FF77";
//   ring(ctx, size);
//   ticks(ctx, state.dragging ? state.delta.drag*0.005 : 0.0, 16, size-16, size-3);
//
//   // Inner ghost
//   ctx.strokeStyle =  state.dragging ? "#FFFFFF55" : "#FF00FF55";
//   ring(ctx, 32);
//
//   // Needle indicators
//   if (state.target.active) {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     ctx.translate(-2.5*state.delta.x, -2.5*state.delta.y);
//
//     // Tasking capabilities
//     keyring(ctx, 80, 32, 6);
//
//   } else {
//     state.delta.x = state.cursor.u - state.reticule.x;
//     state.delta.y = state.cursor.v - state.reticule.y;
//     state.reticule.x += state.delta.x * 0.05;
//     state.reticule.y += state.delta.y * 0.05;
//     ctx.translate(-state.delta.x, -state.delta.y);
//   }
//
//   ctx.strokeStyle =  state.dragging ? "#FFFFFF77" : "#FF00FF77";
//   ring(ctx, 32);
//   ticks(ctx, time/-3000, 4, 32+3, 48, 16);
//
//   document.documentElement.style.cursor = 'url(' + canvas.toDataURL() + ') 64 64, auto';
// };

export const magnitude = (vec) => {
  return Math.sqrt(
    vec.map(x => x*x).reduce((a, b) => a+b, 0.0)
  )
};

export const uniform = (a, b) => {
  return Math.random() * (b - a) + a;
};


export const rgba = (x, z, fade) => {
  const color = x > 0.0 ? "255, 0, 0" : "0, 0, 255";
  const alpha = 1.0 - fade * z;
  return "rgba("+color+", "+alpha+")";
};

export const prune = (group, ind) => {
  delete group[ind];
  for (let v of Object.values(group)) {
    delete v.links[ind]
  }
};