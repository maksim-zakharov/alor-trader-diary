export const random = (maxValue = 100) => {
  return Math.floor(Math.random() * maxValue);
};

export const moneyFormat = (money: number, maximumFractionDigits?: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits,
  }).format(money);

export const fillCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const context = canvas.getContext('2d')!;

  context.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = width;
  canvas.height = height;

  return canvas;
};

export const shortNumberFormat = (number: number) =>
  Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
