from flask import Flask, render_template, request, send_file, redirect, url_for, jsonify, abort
import mimetypes
import os
import shutil
import zipfile
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)
ROOT_DIR = "C:/"


@app.route('/')
@app.route('/<path:subpath>')
def index(subpath=''):
    current_path = os.path.join(ROOT_DIR, subpath)
    if not os.path.exists(current_path):
        abort(404, description="Path does not exist")

    if os.path.isfile(current_path):
        return send_file(current_path)

    files = []
    directories = []

    for item in os.scandir(current_path):
        if item.is_file():
            files.append(item.name)
        elif item.is_dir():
            directories.append(item.name)

    return render_template('index.html', files=files, directories=directories, current_path=subpath)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        return redirect(request.url)
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(ROOT_DIR, request.form['current_path'], filename)
        file.save(file_path)
    return redirect(url_for('index', subpath=request.form['current_path']))


@app.route('/delete', methods=['POST'])
def delete_item():
    item_path = os.path.join(ROOT_DIR, request.form['path'])
    try:
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500


@app.route('/rename', methods=['POST'])
def rename_item():
    old_path = os.path.join(ROOT_DIR, request.form['old_path'])
    new_path = os.path.join(ROOT_DIR, request.form['new_path'])
    try:
        os.rename(old_path, new_path)
        return jsonify(success=True)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500


@app.route('/download', methods=['GET'])
def download_item():
    item_path = os.path.join(ROOT_DIR, request.args.get('path'))
    if os.path.isfile(item_path):
        return send_file(item_path, as_attachment=True)
    elif os.path.isdir(item_path):
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(item_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, item_path)
                    zf.write(file_path, arcname)
        memory_file.seek(0)
        return send_file(memory_file, mimetype='application/zip', as_attachment=True,
                         download_name=os.path.basename(item_path) + '.zip')
    return jsonify(success=False, message="Item not found"), 404


@app.route('/edit', methods=['GET', 'POST'])
def edit_file():
    file_path = os.path.join(ROOT_DIR, request.args.get('path'))

    if request.method == 'POST':
        content = request.form.get('content')
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return jsonify(success=True)
        except Exception as e:
            return jsonify(success=False, error=str(e)), 500
    else:
        if os.path.isfile(file_path):
            file_extension = os.path.splitext(file_path)[1].lower()
            mime_type, _ = mimetypes.guess_type(file_path)

            allowed_extensions = ['.py', '.json', '.js', '.txt', '.gitignore']
            allowed_mime_types = ['text/', 'application/json']

            is_allowed = (file_extension in allowed_extensions or
                          (mime_type and any(mime_type.startswith(t) for t in allowed_mime_types)))

            if not is_allowed:
                return jsonify(success=False, message="Not an editable file type"), 400

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                return jsonify(success=True, content=content)
            except Exception as e:
                return jsonify(success=False, error=str(e)), 500
        else:
            return jsonify(success=True, content='')


if __name__ == '__main__':
    app.run(debug=True)
