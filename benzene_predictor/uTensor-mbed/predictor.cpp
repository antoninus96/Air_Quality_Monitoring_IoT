#include "predictor.h"

float predict(float* values){
	Context ctx;  //creating the context class, the stage where inferences take place 
	//wrapping the input data in a tensor class
	Tensor* input_x = new WrappedRamTensor<float>({1, 3}, values);
	
	get_predictor_ctx(ctx, input_x);  // pass the tensor to the context
	S_TENSOR pred_tensor = ctx.get("y_pred:0");  // getting a reference to the output tensor
	ctx.eval(); //trigger the inference
	
	float pred_label = *(pred_tensor->read<float>(0, 0));  //getting the result back
	
	return pred_label;
}
