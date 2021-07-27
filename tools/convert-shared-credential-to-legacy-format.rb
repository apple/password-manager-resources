#!/usr/bin/env ruby

require 'json'

tools_dir = __dir__
root_dir = File.dirname tools_dir
quirks_dir = File.join root_dir, "quirks"

shared_credentials_file_path = File.join quirks_dir, "shared-credentials.json"
shared_credentials_historical_file_path = File.join quirks_dir, "shared-credentials-historical.json"
output_file_path = File.join quirks_dir, "websites-with-shared-credential-backends.json"

legacy_output_array = []

def addEntriesToLegacyOutputArray(file_path, legacy_output_array)
  file_contents = File.read file_path
  contents_as_object = JSON.parse file_contents

  contents_as_object.each do |dictionary|
    array_to_push_to_legacy_output_array = []
    if dictionary["shared"]
      array_to_push_to_legacy_output_array = dictionary["shared"]
    elsif dictionary["from"] and dictionary["to"]
      array_to_push_to_legacy_output_array = dictionary["from"].concat dictionary["to"]
    end

    if array_to_push_to_legacy_output_array.length > 0
      legacy_output_array.push array_to_push_to_legacy_output_array
    else
      STDERR.puts "ERROR: There was an entry in #{file_path} that couldn't be put into the legacy format."
    end
  end
end

addEntriesToLegacyOutputArray shared_credentials_file_path, legacy_output_array
addEntriesToLegacyOutputArray shared_credentials_historical_file_path, legacy_output_array
legacy_output_array = legacy_output_array.sort_by(&:first)

json_to_output = JSON.pretty_generate(legacy_output_array, indent: '    ') + "\n"
File.write output_file_path, json_to_output
