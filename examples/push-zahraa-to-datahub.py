import csv
import os

from datahub.sdk import DataHubClient, Dataset

csv_path = r"examples\zahraa-curriculum.csv"

client = DataHubClient(
    server=os.environ["DATAHUB_GMS_URL"],
    token=os.environ["DATAHUB_TOKEN"],
)

with open(csv_path, "r", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

for row in rows:
    lesson_id = row["lesson_id"]

    description = (
        f"ZAHRAA Curriculum Metadata | "
        f"Subject: {row['subject']} | "
        f"Grade: {row['grade_level']} | "
        f"Topic: {row['lesson_topic']} | "
        f"Learning Outcome: {row['learning_outcome']} | "
        f"Teacher Guide: {row['teacher_guide']} | "
        f"Assessment Policy: {row['assessment_policy']} | "
        f"Curriculum Standard: {row['curriculum_standard']}"
    )

    dataset = Dataset(
        platform="zahraa_curriculum",
        name=f"grade4.mathematics.{lesson_id}",
        display_name=f"{row['lesson_topic']} — {row['grade_level']}",
        description=description,
        schema=[
            ("lesson_id", "string", "Unique curriculum lesson identifier"),
            ("subject", "string", row["subject"]),
            ("grade_level", "string", row["grade_level"]),
            ("lesson_topic", "string", row["lesson_topic"]),
            ("learning_outcome", "string", row["learning_outcome"]),
            ("teacher_guide", "string", row["teacher_guide"]),
            ("assessment_policy", "string", row["assessment_policy"]),
            ("curriculum_standard", "string", row["curriculum_standard"]),
        ],
    )

    client.entities.upsert(dataset)
    print(f"Uploaded: {lesson_id} - {row['lesson_topic']}")

print("ZAHRAA curriculum metadata uploaded successfully.")



