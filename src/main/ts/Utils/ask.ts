import read from 'read';

export const ask = (question: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    read({
      prompt: question,
    }, (err, answer) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(answer);
    });
  });
};
