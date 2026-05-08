from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage
from deepseek_ai import DeepSeek
import operator
import os

# Set your DeepSeek API key (get free key from deepseek.com)
os.environ["DEEPSEEK_API_KEY"] = "sk-e4ae570b6ae74435b0b8ffefa6364265"

class AgentState(TypedDict):
    session_id: str
    disaster_type: str
    messages: Annotated[List[HumanMessage | AIMessage], add_messages]
    risk_zones: List[dict]
    status: str

llm = DeepSeek(model="deepseek-chat")

def disaster_analysis(state: AgentState) -> AgentState:
    """DeepSeek analyzes disaster spread"""
    prompt = f"""
    Disaster session: {state['session_id']}
    Type: {state['disaster_type']}
    
    Analyze risk and suggest affected areas.
    Return JSON: {{"risk_zones": [{{"area": "str", "risk": "low|medium|high"}}, ...]}}
    """
    
    response = llm.invoke(prompt)
    zones = [{"area": "flood_zone_1", "risk": "high"}]  # Parse JSON later
    
    return {
        "messages": [AIMessage(content=response)],
        "risk_zones": zones,
        "status": "analyzed"
    }

# Build LangGraph workflow
workflow = StateGraph(state_schema=AgentState)
workflow.add_node("analysis", disaster_analysis)
workflow.set_entry_point("analysis")
workflow.add_edge("analysis", END)

disaster_agent = workflow.compile()