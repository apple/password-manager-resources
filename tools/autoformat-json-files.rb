#!/usr/bin/env ruby

require 'json'

tools_dir = __dir__
root_dir = File.dirname(tools_dir)
quirks_dir = File.join(root_dir, "quirks")

Dir.chdir(quirks_dir)

changed_any_or_error = false
error_happened = false

Dir.glob('*.json').each do |file_path|
  relative_path = File.join("quirks", file_path)

  begin
    original_file_contents = File.read(file_path)
    contents_as_object = JSON.parse(original_file_contents)
    if contents_as_object.is_a? Hash
      contents_as_object = contents_as_object.sort_by { |key| key }.to_h
    else
      contents_as_object = contents_as_object.sort
    end

    reformatted_file_contents = JSON.pretty_generate(contents_as_object, indent: '    ') + "\n"
    if original_file_contents != reformatted_file_contents
      changed_any_or_error = true
      File.write file_path, reformatted_file_contents
      puts("Reformatted '#{relative_path}'")
    end
  rescue => exception
    changed_any_or_error = error_happened = true
    STDERR.puts("Issue parsing & reformatting '#{relative_path}' - #{exception.to_s.split("\n")[0]}")
  end
end

if !changed_any_or_error
  puts "No files needed to be reformatted!"
end
if error_happened
  exit 1
end
