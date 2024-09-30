from flask import Flask, render_template, request, send_file, redirect, url_for, jsonify
import os
import shutil
import zipfile
import io

app = Flask(__name__)
ROOT_DIR = "C:/"


@app.route('/')
@app.route('/<path:subpath>')
def index(subpath=''):
    current_path = os.path.join(ROOT_DIR, subpath)
    print(current_path)
    if not os.path.exists(current_path):
        return "Path does not exist", 404

    if os.path.isfile(current_path):
        return send_file(current_path)

    files = []
    directories = []

    for item in os.listdir(current_path):
        item_path = os.path.join(current_path, item)
        if os.path.isfile(item_path):
            files.append(item)
        elif os.path.isdir(item_path):
            directories.append(item)

    return render_template('index.html', files=files, directories=directories, current_path=subpath)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        return redirect(request.url)
    if file:
        filename = os.path.join(ROOT_DIR, request.form['current_path'], file.filename)
        file.save(filename)
    return redirect(url_for('index', subpath=request.form['current_path']))


@app.route('/delete', methods=['POST'])
def delete_item():
    item_path = os.path.join(ROOT_DIR, request.form['path'])
    if os.path.isfile(item_path):
        os.remove(item_path)
    elif os.path.isdir(item_path):
        shutil.rmtree(item_path)
    return jsonify(success=True)


@app.route('/rename', methods=['POST'])
def rename_item():
    old_path = os.path.join(ROOT_DIR, request.form['old_path'])
    new_path = os.path.join(ROOT_DIR, request.form['new_path'])
    os.rename(old_path, new_path)
    return jsonify(success=True)


@app.route('/download', methods=['GET'])
def download_item():
    item_path = os.path.join(ROOT_DIR, request.args.get('path'))
    if os.path.isfile(item_path):
        return send_file(item_path, as_attachment=True)
    elif os.path.isdir(item_path):
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(item_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, item_path)
                    zf.write(file_path, arcname)
        memory_file.seek(0)
        return send_file(memory_file, mimetype='application/zip', as_attachment=True,
                         download_name=os.path.basename(item_path) + '.zip')
    return jsonify(success=False, message="Item not found"), 404


if __name__ == '__main__':
    app.run(debug=True)
