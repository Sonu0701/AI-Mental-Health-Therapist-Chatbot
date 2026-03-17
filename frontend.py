# Step1: Setup Streamlit
import streamlit as st
import requests

BACKEND_URL = "http://localhost:8000/ask"

st.set_page_config(
    page_title="SafeSpace AI Therapist",
    page_icon="🧠",
    layout="wide"
)

# ---------- SIDEBAR ----------
with st.sidebar:
    st.title("🧠 SafeSpace")
    st.markdown("AI Mental Health Support Chatbot")

    st.markdown("---")

    st.markdown("### About")
    st.write(
        "SafeSpace is an AI-powered mental health chatbot designed "
        "to provide supportive conversations and emotional guidance."
    )

    st.markdown("---")

    if st.button("🗑 Clear Chat"):
        st.session_state.chat_history = []
        st.rerun()

# ---------- MAIN TITLE ----------
st.title("🧠 SafeSpace – AI Mental Health Therapist")
st.caption("A safe place to share your thoughts 💙")

# ---------- SESSION STATE ----------
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# ---------- DISPLAY CHAT HISTORY ----------
for msg in st.session_state.chat_history:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# ---------- CHAT INPUT ----------
user_input = st.chat_input("What's on your mind today?")

if user_input:

    # Add user message
    st.session_state.chat_history.append(
        {"role": "user", "content": user_input}
    )

    with st.chat_message("user"):
        st.markdown(user_input)

    # Loading animation
    with st.spinner("Thinking..."):
        response = requests.post(
            BACKEND_URL,
            json={"message": user_input}
        )

    # Parse backend response
    data = response.json()

    ai_reply = data["response"]
    tool_used = data["tool_called"]

    # Show tool only if used
    if tool_used != "None":
        formatted_reply = f"""
{ai_reply}

<div style='font-size:12px;color:gray;margin-top:10px'>
⚙ Tool used: <b>{tool_used}</b>
</div>
"""
    else:
        formatted_reply = ai_reply

    # Add AI message
    st.session_state.chat_history.append(
        {"role": "assistant", "content": formatted_reply}
    )

    with st.chat_message("assistant"):
        st.markdown(formatted_reply, unsafe_allow_html=True)

# ---------- FOOTER ----------
st.markdown("---")
st.markdown(
    "<center>SafeSpace AI Therapist • Built with Streamlit & FastAPI</center>",
    unsafe_allow_html=True
)