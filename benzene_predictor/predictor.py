import tensorflow as tf
from tensorflow.python.framework import graph_util as gu
from tensorflow.python.framework.graph_util import remove_training_nodes
import tensorflow.keras.layers as layers
import tensorflow.keras as keras
import pandas as pd
import numpy as np

# parsing the files in the given directory
def parse():
	#parsing the dataset
	dataset = pd.read_csv("./AirQualityUCI.csv",keep_default_na=False, comment='\t',sep=";", skipinitialspace=True,usecols=[2,12,13,5],nrows=9357,dtype=np.float32)
	train_dataset = dataset.sample(frac=0.8,random_state=0)
	test_dataset = dataset.drop(train_dataset.index)
	train_labels = train_dataset.pop('C6H6(GT)')
	test_labels = test_dataset.pop('C6H6(GT)')
	return train_dataset,train_labels,test_dataset,test_labels

# building the model with keras
def build_keras_model(train_dataset,train_labels,test_dataset,test_labels):
	model = keras.Sequential([
    layers.Dense(64, activation=tf.nn.relu, input_shape=[len(train_dataset.keys())]),
    layers.Dense(64, activation=tf.nn.relu),
    layers.Dense(1)
  ])

	optimizer = tf.train.RMSPropOptimizer(0.001)
	model.compile(loss='mean_squared_error',
                optimizer=optimizer,
                metrics=['mean_absolute_error', 'mean_squared_error'])
	model.fit(train_dataset,train_labels, epochs=1000, validation_split = 0.2)
	test_predictions = model.predict(test_dataset).flatten()
	error = test_predictions - test_labels
	print(error)
	model.save("predictor.h5")

# using a different model without keras
def linear_regression_model(x,y,test_x=None,test_y=None,training_epochs=1000,learning_rate=0.01):
	# getting placeholders (our input values)
	X = tf.placeholder(np.float32,[None,3],name="X")
	Y = tf.placeholder(np.float32,name="Y") 
	# declaring weights and bias
	W = tf.Variable(np.random.randn(3,1), name = "W",dtype=np.float32) 
	b = tf.Variable(np.random.randn(), name = "b",dtype=np.float32)
	# Hypothesis 
	y_pred = tf.add(tf.matmul(X, W), b,name="y_pred")
	# Mean Squared Error Cost Function
	cost = tf.reduce_sum(tf.pow(y_pred-Y, 2)) / (2 * len(x)) 
	# Gradient Descent Optimizer 
	optimizer = tf.train.GradientDescentOptimizer(learning_rate).minimize(cost) 
	# Global Variables Initializer 
	init = tf.global_variables_initializer()
	# Starting the Tensorflow Session 
	with tf.Session() as sess:
		# Initializing the Variables 
		sess.run(init)
		saver = tf.train.Saver()
		# Iterating through all the epochs 
		for epoch in range(training_epochs):
			# Feeding each data point into the optimizer using Feed Dictionary
			for i in range(len(x)):
				sess.run(optimizer, feed_dict = {X: [x[i]], Y:[y[i]]})
			# Displaying the result after every 50 epochs 
			if (epoch + 1) % 50 == 0: 
				# Calculating the cost a every epoch 
				c = sess.run(cost, feed_dict = {X: x, Y:y}) 
				print("Epoch", (epoch + 1), ": cost =", c, "W =", sess.run(W), "b =", sess.run(b)) 
		
		# Storing necessary values to be used outside the Session 
		training_cost =sess.run(cost, feed_dict = {X: x, Y:y}) 
		weight = sess.run(W) 
		bias = sess.run(b)
		#saving our model
		saver.save(sess, "./chkps/mnist_model")
		out_nodes = [y_pred.op.name]
		print("output_nodes: ",out_nodes)
		sub_graph_def = remove_training_nodes(sess.graph_def)
		sub_graph_def = gu.convert_variables_to_constants(sess, sub_graph_def, out_nodes)
		graph_path = tf.train.write_graph(sub_graph_def,
                                  "./predictor_model",
                                  "predictor.pb",
                                  as_text=False)

		print('written graph to: %s' % graph_path)
		sess.close()

	# testing the model
	if not (test_x.any()==None or test_y.any()==None): 
		for i in range(len(test_x)):
			# Calculating the predictions 
			prediction = np.matmul(x[i],weight).flatten() + bias 
			print("Training cost =", training_cost, "Weight =", weight, "bias =", bias,"prediction =",prediction,"value =",y[i], '\n')


def main():
	train_dataset,train_labels,test_dataset,test_labels=parse()
	#model=keras_model(train_dataset,train_labels,test_dataset,test_labels)
	model=linear_regression_model(train_dataset.to_numpy(),train_labels.to_numpy(),test_dataset.to_numpy(),test_labels.to_numpy())
	
main()
