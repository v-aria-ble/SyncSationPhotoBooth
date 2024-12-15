from flask import Flask, request, jsonify
from PIL import Image, ImageFont, ImageDraw
import io
import base64
import cv2
import numpy as np
from deepface import DeepFace
from flask_cors import CORS  # Import CORS
app = Flask(__name__)
CORS(app)

# Helper function to decode base64 image
def decode_image(base64_image):
    image_data = base64.b64decode(base64_image.split(',')[1])
    return Image.open(io.BytesIO(image_data))

# Helper function to encode image to base64
def encode_image(image):
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    buffer.seek(0)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.read()).decode()

@app.route('/process', methods=['POST'])
def process_image():
    data = request.get_json()
    base64_image = data['image']

    # Decode and process image
    image = decode_image(base64_image)
    image_np = np.array(image)

    # Analyze emotions using DeepFace
    analysis = DeepFace.analyze(img_path=image_np, actions=['emotion'], enforce_detection=False)

    # Ensure results is always a list
    results = analysis if isinstance(analysis, list) else [analysis]

    dominant_emotions = []
    overall_emotion_scores = {}

    # Define the color for the bounding box and text
    box_color = (248, 205, 67)  # #F8CD43 in RGB

    for result in results:
        emotions = result['emotion']
        dominant_emotion = max(emotions, key=emotions.get)
        dominant_emotions.append(dominant_emotion)

        # Aggregate emotion scores
        for emotion, score in emotions.items():
            overall_emotion_scores[emotion] = overall_emotion_scores.get(emotion, 0) + score

        # Draw bounding box and label on image with the new color
        x, y, w, h = result['region']['x'], result['region']['y'], result['region']['w'], result['region']['h']
        cv2.rectangle(image_np, (x, y), (x + w, y + h), box_color, 1)
        cv2.putText(image_np, dominant_emotion, (x, y - 10),
                    cv2.FONT_HERSHEY_COMPLEX_SMALL, 0.9, box_color, 2)

    # Calculate overall dominant emotion
    overall_dominant_emotion = max(
        overall_emotion_scores,
        key=lambda k: overall_emotion_scores[k] / len(results)
    )

    # Convert image back to base64
    processed_image = Image.fromarray(image_np)
    response_image = encode_image(processed_image)

    # Send back processed image and emotions
    return jsonify({
        'processed_image': response_image,
        'dominant_emotions': dominant_emotions,
        'overall_dominant_emotion': overall_dominant_emotion
    })

if __name__ == '__main__':
    app.run(debug=True)
