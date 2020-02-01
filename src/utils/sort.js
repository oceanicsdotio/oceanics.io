function partition(arr, low, high, col) {
  let ii = low - 1;
  let temp;
  const pivot = arr[high];

  for (let jj=low; jj<high; jj++) {
    if (arr[jj][col] <= pivot[col]) {
      ii++;
      temp = arr[jj];
      arr[jj] = arr[ii];
      arr[ii] = temp;
    }
  }
  temp = arr[ii+1];
  arr[ii+1] = arr[high];
  arr[high] = temp;
  return ii + 1;
}

export default function quickSort(arr, low, high, col) {
  if (low < high) {

    let index = partition(arr, low, high, col);

    quickSort(arr, low, index-1, col);
    quickSort(arr, index+1, high, col);
  }
}
