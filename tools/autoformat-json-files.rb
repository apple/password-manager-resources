#!/usr/bin/env ruby

require 'json'

tools_dir = __dir__
root_dir = File.dirname(tools_dir)
quirks_dir = File.join(root_dir, "quirks")

Dir.chdir(quirks_dir)

changed_any_or_error = false
error_happened = false

Dir.glob('*.json').each do |fPath|
    relativePath = File.join("quirks", fPath)

    begin
        original = File.read(fPath)
        parsed = JSON.parse(original)
        reformatted = JSON.pretty_generate(parsed, indent: '    ') + "\n"
        if original != reformatted
            changed_any_or_error = true
            File.write(fPath, reformatted)
            puts("Reformatted '#{relativePath}'")
        end
    rescue => exception
        changed_any_or_error = error_happened = true
        STDERR.puts("Issue parsing & reformatting '#{relativePath}' - #{exception.to_s.split("\n")[0]}")
    end
end

if !changed_any_or_error
    puts('No files needed to be reformatted!')
end
if error_happened
    exit(1)
end
