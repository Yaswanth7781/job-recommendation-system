from fastapi import FastAPI
from pydantic import BaseModel
import nltk
import string
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('stopwords')
app = FastAPI()
stop_words = set(stopwords.words('english'))

class TextInput(BaseModel):
    text: str

class DatasetInput(BaseModel):
    documents: list

def preprocess(text):
    text = text.lower()
    tokens = word_tokenize(text)
    tokens = [word for word in tokens if word not in stop_words and word not in string.punctuation]
    return ' '.join(tokens)

@app.post('/preprocess_query')
def preprocess_query(data: TextInput):
    cleaned = preprocess(data.text)
    return {'cleaned_text': cleaned}

@app.post('/preprocess_dataset')
def preprocess_dataset(data: DatasetInput):
    cleaned_documents = []
    for doc in data.documents:
        cleaned_documents.append(preprocess(doc))
    return {'cleaned_documents': cleaned_documents}