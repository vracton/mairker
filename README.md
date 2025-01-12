# Mairker

My project for Congressional App Challenge District Il-11 2023 which, unfortunately, did not end up winning.

[Submission Video TBA]

---

## Machine Learning Model

Using `Keras` and training data from Google's `Quick, Draw!` experiment, I created a model that was trained for 30 epochs. The model is run on the client side using `TensorFlow.js`.

[Trained Model](https://github.com/vracton/mairker/blob/main/main/content/Mairker.tflite)
Training Code: TO BE ADDED
>I didn't use Github (or an alternative) when this project was made, so it is not hosted anywhere and I've had difficulty finding the training code. Will commit if (when?) found.

## Website

The backend of the game site is an `Express` server running `Socket.IO` to handle communications between the client and server.

## Installation

To run this project you will need to have `Node.js` installed.

Clone this repository.

Run `npm install`.

Start the server using `node index.js`.