FROM public.ecr.aws/lambda/python:3.13

# install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency file and install dependencies
COPY pyproject.toml .
RUN uv pip install --system -r pyproject.toml

# Copy handler code
COPY handler.py .

# Set Python path
ENV PYTHONPATH=/var/task

# Set the Lambda handler
CMD ["handler.greyscale_handler"]
