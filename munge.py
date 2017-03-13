import numpy as np
import pandas as pd

data = pd.read_csv("data/DOHMH_New_York_City_Restaurant_Inspection_Results.csv")
data["INSPECTION DATE"] = pd.to_datetime(data["INSPECTION DATE"], infer_datetime_format=True)
data["GRADE DATE"] = pd.to_datetime(data["GRADE DATE"], infer_datetime_format=True)
data["RECORD DATE"] = pd.to_datetime(data["RECORD DATE"], infer_datetime_format=True)
uniquedata = data.groupby(["CAMIS", "INSPECTION DATE"]).first()
uniquedata = uniquedata.drop(["ACTION", "VIOLATION CODE", "VIOLATION DESCRIPTION", "CRITICAL FLAG"], axis=1)
uniquedata.to_csv("data/DOHMH_unique_inspections.csv")
